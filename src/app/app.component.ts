import { Component, OnDestroy } from '@angular/core';
import { asyncScheduler, combineLatest, first, map, merge, Observable, observeOn, shareReplay, Subject, Subscription } from 'rxjs';
import { ReactiveFluxCacheService } from './services/reactive-flux-cache.service';
import { Car, Create, User } from './shared/types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {

  private readonly selectedCar$$ = new Subject<Car | undefined>();
  private readonly selectedClient$$ = new Subject<User | undefined>();
  public readonly unselectAll$$ = new Subject<void>();


  readonly selectedCar$: Observable<Car | undefined | any> = merge(
    this.selectedCar$$,
    this.unselectAll$$.pipe(map(() => undefined)),
  ).pipe(
    shareReplay(1),
    observeOn(asyncScheduler)
  );
  readonly selectedClient$: Observable<User | undefined> = merge(
    this.selectedClient$$,
    this.unselectAll$$.pipe(map(() => undefined)),
  ).pipe(
    shareReplay(1),
    observeOn(asyncScheduler)
  );

  readonly clients$: Observable<{ user: User, cars: Car[] }[]> = combineLatest([
    this.dataService.getAllUsersReactively$(),
    this.dataService.getAllUserCarBindingsReactively$(),
    this.dataService.getAllCarsReactively$()
  ]).pipe(
    map(([users, bindings, cars]) => {
      return users.map(user => ({
        user,
        cars: bindings
          .filter(binding => binding.userId === user.id)
          .map(binding => cars.find(car => car.id === binding.carId))
          .filter((car): car is Car => !!car),
      }));
    }),
  );

  readonly freeCars$ = combineLatest([
    this.dataService.getAllCarsReactively$(),
    this.dataService.getAllUserCarBindingsReactively$(),
  ]).pipe(
    map(([cars, bindings]) => {
      return cars.filter(car => !bindings.find(binding => binding.carId === car.id));
    })
  )

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly dataService: ReactiveFluxCacheService
  ) {
    this.subscriptions.add(
      combineLatest([this.selectedCar$, this.selectedClient$]).subscribe(([car, client]) => {
        if (car && client) {
          this.dataService.assignCarToUser(client.id, car.id);
          this.unselectAll();
        }
      })
    );

    this.subscriptions.add(
      this.dataService.getErrors$().subscribe(error => {
        console.error(error.message);
      })
    );
  }

  selectUser(user: User | undefined) {
    this.selectedClient$$.next(user);
  }

  selectCar(car: Car | undefined) {
    this.selectedCar$$.next(car);
  }

  addUser(user: Create<User>) {
    this.dataService.addUser(user);
  }

  editUser(user: User) {
    this.dataService.updateUser(user);
  }

  removeUser(user: User) {
    this.dataService.deleteUser(user);
  }

  removeCarFromUser(carAndUser: { carId: string, userId: string }) {
    this.dataService.unassignCarFromUser(carAndUser.userId, carAndUser.carId);
  }

  addCar(car: Create<Car>) {
    this.dataService.addCar(car);
  }

  carRemove(carId: string) {
    this.dataService.deleteCar(carId);
  }

  stopPropagation($event: Event) {
    $event.stopPropagation();
  }

  unselectAll() {
    this.unselectAll$$.next();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

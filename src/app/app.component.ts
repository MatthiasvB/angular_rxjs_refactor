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
  private readonly unselectAll$$ = new Subject<void>();


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

  /*
   * Forms are hard to use in a reactive way.
   * They do not accept Observables as inputs.
   * That's why we stick to imperative programming here.
   */
  userForm = {
    firstName: '',
    lastName: '',
    email: ''
  };

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
      this.selectedClient$.subscribe(user => {
        if (user) {
          this.userForm = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          };
        } else {
          this.userForm = { firstName: '', lastName: '', email: '' };
        }
      })
    );

    this.subscriptions.add(
      this.dataService.getErrors$().subscribe(error => {
        console.error(error.message);
      })
    );
  }

  selectClient($event: Event, client: User) {
    $event.stopPropagation();
    this.selectedClient$$.next(client);
  }

  removeCarFromUser($event: MouseEvent, car: Car, user: User) {
    $event.stopPropagation();
    this.dataService.unassignCarFromUser(user.id, car.id);
    this.unselectAll$$.next();
  }

  userSubmit($event: Event) {
    $event.stopPropagation();
    const { firstName, lastName, email } = this.userForm;
    if (!firstName || !lastName || !email) {
      return;
    }
    this.selectedClient$.pipe(first()).subscribe(user => {
      if (user) {
        this.dataService.updateUser({ ...user, firstName, lastName, email })
      } else {
        this.dataService.addUser({ firstName, lastName, email })
      }
      this.selectedClient$$.next(undefined);
    });
    this.userForm = { firstName: '', lastName: '', email: '' };
  }

  userRemove($event: Event) {
    $event.stopPropagation();
    this.selectedClient$.pipe(first()).subscribe(user => {
      if (user) {
        this.dataService.deleteUser(user);
        this.selectedClient$$.next(undefined);
      }
    });
  }

  carSubmit(car: Create<Car>) {
    this.dataService.addCar(car);
  }

  carRemove(carId: string) {
    this.dataService.deleteCar(carId);
  }

  stopPropagation($event: Event) {
    $event.stopPropagation();
  }

  unselectAll() {
    this.userForm = { firstName: '', lastName: '', email: '' };
    this.unselectAll$$.next();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

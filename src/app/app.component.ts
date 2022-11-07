import { Component, OnDestroy } from '@angular/core';
import { asyncScheduler, combineLatest, first, map, merge, Observable, observeOn, shareReplay, Subject, Subscription } from 'rxjs';
import { MobilityService } from './services/mobility.service';
import { Errors } from './shared/enums';
import { Car, User } from './shared/types';

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

  readonly clients$ = this.mobilityService.getAllClients$();

  readonly freeCars$ = this.mobilityService.getAllFreeCars$();

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

  carForm = {
    make: '',
    model: '',
    year: ''
  }

  constructor(
    private readonly mobilityService: MobilityService
  ) {
    this.subscriptions.add(this.mobilityService.getErrors$().subscribe(error => {
      switch (error) {
        case Errors.CannotFetchData:
          alert('An error occurred while fetching data');
          break;
        case Errors.EmptyResponse:
          alert('Received an unexpected empty response');
          break;
        case Errors.OutdatedData:
          confirm('Data is outdated. Do you want to refresh?') && this.mobilityService.refresh();
          break;
      }
    }));

    this.subscriptions.add(
      combineLatest([this.selectedCar$, this.selectedClient$]).subscribe(([car, client]) => {
        if (car && client) {
          this.mobilityService.assignCarToUser(car.id, client.id);
          this.unselectAll();
        }
      })
    );
  }

  selectCar($event: Event, car: Car) {
    $event.stopPropagation();
    this.selectedCar$$.next(car);
  }

  selectClient($event: Event, client: User) {
    $event.stopPropagation();
    this.selectedClient$$.next(client);
  }

  removeCarFromUser($event: MouseEvent, car: Car, user: User) {
    $event.stopPropagation();
    this.mobilityService.removeCarFromUser(car.id, user.id);
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
        this.mobilityService.updateUser({ ...user, firstName, lastName, email })
      } else {
        this.mobilityService.addUser({ firstName, lastName, email })
      }
      this.selectedClient$$.next(undefined);
    });
    this.userForm = { firstName: '', lastName: '', email: '' };
  }

  userRemove($event: Event) {
    $event.stopPropagation();
    this.selectedClient$.pipe(first()).subscribe(user => {
      if (user) {
        this.mobilityService.removeUser(user);
        this.selectedClient$$.next(undefined);
      }
    });
  }


  carSubmit($event: Event) {
    $event.stopPropagation();
    const { make, model, year } = this.carForm;
    if (!make || !model || !year) {
      return;
    }
    this.mobilityService.addCar({ make, model, year: +year })
    this.carForm = { make: '', model: '', year: '' };
  }

  carRemove($event: Event) {
    $event.stopPropagation();
    this.selectedCar$.pipe(first()).subscribe(car => {
      if (car) {
        this.mobilityService.removeCar(car.id);
        this.selectedCar$$.next(undefined);
      }
    });
  }

  stopPropagation($event: Event) {
    $event.stopPropagation();
  }

  unselectAll() {
    this.userForm = { firstName: '', lastName: '', email: '' };
    this.carForm = { make: '', model: '', year: '' };
    this.unselectAll$$.next();
  }

  refreshState() {
    this.mobilityService.refresh();
    this.unselectAll();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

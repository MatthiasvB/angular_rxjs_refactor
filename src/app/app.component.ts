import { Component, OnDestroy } from '@angular/core';
import { catchError, combineLatest, distinctUntilChanged, filter, forkJoin, map, merge, Observable, of, scan, share, shareReplay, startWith, Subject, Subscription, switchMap, tap, withLatestFrom } from 'rxjs';
import { MockDataService } from './services/mock-data.service';
import { Errors } from './shared/enums';
import { Car, Client, Create, User } from './shared/types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {

  private readonly initialClients: Client[] = [];
  private readonly initialFreeCars: Car[] = [];

  private readonly selectedCar$$ = new Subject<Car | undefined>();
  private readonly selectedClient$$ = new Subject<User | undefined>();
  private readonly removeCarFromUser$$ = new Subject<{ car: Car, user: User }>();
  private readonly submitUser$$ = new Subject<Create<User>>();
  private readonly removeUser$$ = new Subject<void>();
  private readonly submitCar$$ = new Subject<Create<Car>>();
  private readonly removeCar$$ = new Subject<void>();
  private readonly refresh$$ = new Subject<void>();
  private readonly unselectAll$$ = new Subject<void>();

  private readonly unselectAll$ = merge(
    this.unselectAll$$,
    of(undefined).pipe(switchMap(() => this.carAssignedToUser$)),
  ).pipe(map(() => undefined), share());

  readonly selectedCar$: Observable<Car | undefined> = merge(
    this.selectedCar$$,
    this.unselectAll$,
    of(undefined).pipe(
      switchMap(() => merge(
        this.carRemoved$,
        this.carAdded$,
        this.carUpdated$
      )),
      map(() => undefined)
    )
  ).pipe(
    shareReplay()
  );
  readonly selectedClient$: Observable<User | undefined> = merge(
    this.selectedClient$$,
    this.unselectAll$,
    of(undefined).pipe(
      switchMap(() => merge(
        this.userRemoved$,
        this.userAdded$,
        this.userUpdated$
      )),
      map(() => undefined)
    )
  ).pipe(
    shareReplay()
  );

  private readonly refresh$: Observable<void> = merge(
    this.refresh$$,
    of(undefined).pipe(
      switchMap(() => this.errors$.pipe(
        filter(error => error === Errors.OutdatedData),
        map(() => window.confirm('Data is outdated. Do you want to refresh?')),
        filter(Boolean),
      )),
      map(() => undefined)
    )
  ).pipe(
    share()
  );


  private readonly carRemoved$ = this.removeCar$$.pipe(
    withLatestFrom(this.selectedCar$$),
    map(([_, car]) => car),
    filter((car): car is Car => !!car),
    switchMap(car => this.dataService.deleteCar(car.id).pipe(
      map(() => car.id),
      catchError(() => of(Errors.OutdatedData)),
    )),
  ).pipe(
    share()
  );

  private readonly carUpdated$ = this.submitCar$$.pipe(
    withLatestFrom(this.selectedCar$),
    filter((arr): arr is [Create<Car>, Car] => !!arr[1]),
    switchMap(([car, selectedCar]) =>
      this.dataService.updateCar({ id: selectedCar.id, ...car }).pipe(
        switchMap(() => this.dataService.getCarById(selectedCar.id).pipe(
          catchError(() => of(Errors.CannotFetchData)),
        )),
        map(car => car ?? Errors.EmptyResponse),
        catchError(() => of(Errors.OutdatedData)),
      )
    )
  ).pipe(
    share()
  );

  private readonly carAdded$ = this.submitCar$$.pipe(
    withLatestFrom(this.selectedCar$),
    filter((arr): arr is [Create<Car>, undefined] => !arr[1]),
    switchMap(([car]) => this.dataService.addCar(car).pipe(
      switchMap(carId => this.dataService.getCarById(carId).pipe(
        catchError(() => of(Errors.CannotFetchData)),
      )),
      map(car => car ?? Errors.EmptyResponse),
      catchError(() => of(Errors.OutdatedData)),
    ))
  ).pipe(
    share()
  );

  private readonly userAdded$ = this.submitUser$$.pipe(
    withLatestFrom(this.selectedClient$),
    filter((arr): arr is [Create<User>, undefined] => !arr[1]),
    switchMap(([user]) => this.dataService.addUser(user).pipe(
      switchMap(userId => this.dataService.getUserById(userId).pipe(
        catchError(() => of(Errors.CannotFetchData)),
      )),
      map(user => user ?? Errors.EmptyResponse),
      catchError(() => of(Errors.OutdatedData)),
    ))
  ).pipe(
    share()
  );

  private readonly userUpdated$ = this.submitUser$$.pipe(
    withLatestFrom(this.selectedClient$),
    filter((arr): arr is [Create<User>, User] => !!arr[1]),
    switchMap(([user, selectedUser]) =>
      this.dataService.updateUser({ id: selectedUser.id, ...user }).pipe(
        switchMap(() => this.dataService.getUserById(selectedUser.id).pipe(
          catchError(() => of(Errors.CannotFetchData)),
        )),
        map(user => user ?? Errors.EmptyResponse),
        catchError(() => of(Errors.OutdatedData)),
      )
    )
  ).pipe(
    share()
  );

  private readonly userRemoved$ = this.removeUser$$.pipe(
    withLatestFrom(this.selectedClient$$),
    map(([_, user]) => user),
    filter((user): user is User => !!user),
    switchMap(user => this.dataService.deleteUser(user).pipe(
      map(() => user.id),
      catchError(() => of(Errors.OutdatedData)),
    )),
  ).pipe(
    share()
  );

  private readonly carRemovedFromUser$ = this.removeCarFromUser$$.pipe(
    switchMap(({ car, user }) => this.dataService.unassignCarFromUser(user.id, car.id).pipe(
      map(() => ({ car, user })),
      catchError(() => of(Errors.OutdatedData)),
    ))
  ).pipe(
    share()
  );

  carAssignedToUser$ = combineLatest([
    this.selectedCar$,
    this.selectedClient$,
  ]).pipe(
    filter((carAndUser): carAndUser is [Car, User] => !!carAndUser[0] && !!carAndUser[1]),
    switchMap(([car, user]) => this.dataService.assignCarToUser(user.id, car.id).pipe(
      map(() => ({ car, user })),
      catchError(() => of(Errors.OutdatedData)),
    ))
  ).pipe(
    share()
  );

  readonly clients$ = merge(
    this.refresh$.pipe(
      startWith(undefined),
      switchMap(() => this.dataService.getAllUsers().pipe(
        switchMap(users => forkJoin(users.map(user =>
          this.dataService.getCarsByUserId(user.id).pipe(
            map(cars => ({ user, cars }))
          )
        )))
      )),
      map(clients => (arg: unknown) => clients)
    ),
    this.carRemoved$.pipe(
      filter((carId): carId is string => typeof carId === 'string'),
      map(carId => (clients: Client[]) => clients.map(client => ({
        ...client,
        cars: client.cars.filter(car => car.id !== carId)
      })))
    ),
    this.carUpdated$.pipe(
      filter((car): car is Car => typeof car !== 'number'),
      map(car => (clients: Client[]) => clients.map(client => ({
        ...client,
        cars: client.cars.map(c => c.id === car.id ? car : c)
      })))
    ),
    this.userAdded$.pipe(
      filter((user): user is User => typeof user !== 'number'),
      map(user => (clients: Client[]) => [...clients, { user, cars: [] }])
    ),
    this.userUpdated$.pipe(
      filter((user): user is User => typeof user !== 'number'),
      map(user => (clients: Client[]) => clients.map(client => client.user.id === user.id ? { user, cars: client.cars } : client))
    ),
    this.userRemoved$.pipe(
      filter((userId): userId is string => typeof userId === 'string'),
      map(userId => (clients: Client[]) => clients.filter(client => client.user.id !== userId))
    ),
    this.carRemovedFromUser$.pipe(
      filter((arg): arg is { car: Car, user: User } => typeof arg !== 'number'),
      map(({ car, user }) => (clients: Client[]) => clients.map(client => client.user.id === user.id ? {
        user: client.user,
        cars: client.cars.filter(c => c.id !== car.id)
      } : client))
    ),
    this.carAssignedToUser$.pipe(
      filter((arg): arg is { car: Car, user: User } => typeof arg !== 'number'),
      map(({ car, user }) => (clients: Client[]) => clients.map(client => client.user.id === user.id ? {
        user: client.user,
        cars: [...client.cars, car]
      } : client))
    ),
  ).pipe(
    scan((clients, modifier) => modifier(clients), this.initialClients),
    startWith(this.initialClients),
    shareReplay(1),
  );


  freeCars$ = merge(
    this.refresh$.pipe(
      startWith(undefined),
      withLatestFrom(this.clients$),
      switchMap(([_, clients]) => this.dataService.getAllCars().pipe(
        map(cars => cars.filter(car => !clients.some(client => client.cars.some(c => c.id === car.id)))),
      )),
      map(cars => (arg: unknown) => cars)
    ),
    this.carRemoved$.pipe(
      filter((carId): carId is string => typeof carId === 'string'),
      map(carId => (cars: Car[]) => cars.filter(car => car.id !== carId))
    ),
    this.carAdded$.pipe(
      filter((car): car is Car => typeof car !== 'number'),
      map(car => (cars: Car[]) => [...cars, car])
    ),
    this.carUpdated$.pipe(
      filter((car): car is Car => typeof car !== 'number'),
      map(car => (cars: Car[]) => cars.map(c => c.id === car.id ? car : c))
    ),
    this.carAssignedToUser$.pipe(
      filter((arg): arg is { car: Car, user: User } => typeof arg !== 'number'),
      map(({ car }) => (cars: Car[]) => cars.filter(c => c.id !== car.id))
    ),
    this.carRemovedFromUser$.pipe(
      filter((arg): arg is { car: Car, user: User } => typeof arg !== 'number'),
      map(({ car }) => (cars: Car[]) => [...cars, car])
    ),
  ).pipe(
    scan((cars, modifier) => modifier(cars), this.initialFreeCars),
    startWith(this.initialFreeCars),
    shareReplay(1),
  );

  private readonly errors$: Observable<Errors> = merge(
    this.carRemoved$.pipe(filter((error): error is Errors => typeof error === 'number')),
    this.carUpdated$.pipe(filter((error): error is Errors => typeof error === 'number')),
    this.carAdded$.pipe(filter((error): error is Errors => typeof error === 'number')),
    this.userAdded$.pipe(filter((error): error is Errors => typeof error === 'number')),
    this.userUpdated$.pipe(filter((error): error is Errors => typeof error === 'number')),
    this.userRemoved$.pipe(filter((error): error is Errors => typeof error === 'number')),
    this.carRemovedFromUser$.pipe(filter((error): error is Errors => typeof error === 'number')),
    this.carAssignedToUser$.pipe(filter((error): error is Errors => typeof error === 'number')),
  ).pipe(
    share()
  );

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
    // MockDataService pretends to perform HTTP requests
    private readonly dataService: MockDataService,
  ) {
    this.subscriptions.add(this.errors$.subscribe(error => {
      switch (error) {
        case Errors.CannotFetchData:
          alert('An error occurred while fetching data');
          break;
        case Errors.EmptyResponse:
          alert('Received an unexpected empty response');
          break;
      }
    }));
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
    this.removeCarFromUser$$.next({ car, user });
  }

  userSubmit($event: Event) {
    $event.stopPropagation();
    const { firstName, lastName, email } = this.userForm;
    if (!firstName || !lastName || !email) {
      return;
    }
    this.submitUser$$.next({ firstName, lastName, email });
    this.userForm = { firstName: '', lastName: '', email: '' };
  }

  userRemove($event: Event) {
    $event.stopPropagation();
    this.removeUser$$.next();
  }


  carSubmit($event: Event) {
    $event.stopPropagation();
    const { make, model, year } = this.carForm;
    if (!make || !model || !year) {
      return;
    }
    this.submitCar$$.next({ make, model, year: +year });
    this.carForm = { make: '', model: '', year: '' };
  }

  carRemove($event: Event) {
    $event.stopPropagation();
    this.removeCar$$.next();
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
    this.refresh$$.next();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

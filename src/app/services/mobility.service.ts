import { Injectable } from '@angular/core';
import { catchError, connectable, filter, forkJoin, map, merge, Observable, of, scan, share, shareReplay, startWith, Subject, switchMap, withLatestFrom } from 'rxjs';
import { Errors } from '../shared/enums';
import { Car, Client, Create, User } from '../shared/types';
import { ReactiveFluxCacheService } from './mock-data.service';

@Injectable({
  providedIn: 'root'
})
export class MobilityService {

  private readonly initialClients: Client[] = [];
  private readonly initialFreeCars: Car[] = [];

  private readonly assignCarToUser$$ = new Subject<{ carId: string; userId: string }>();
  private readonly removeCarFromUser$$ = new Subject<{ carId: string; userId: string }>();
  private readonly addUser$$ = new Subject<Create<User>>();
  private readonly updateUser$$ = new Subject<User>();
  private readonly removeUser$$ = new Subject<User>();
  private readonly addCar$$ = new Subject<Create<Car>>();
  private readonly updateCar$$ = new Subject<Car>();
  private readonly removeCar$$ = new Subject<string>();
  private readonly refresh$$ = new Subject<void>();

  private readonly refresh$: Observable<void> = merge(
    this.refresh$$,
  ).pipe(
    share()
  );

  private readonly carRemoved$ = this.removeCar$$.pipe(
    switchMap(carId => this.dataService.deleteCar(carId).pipe(
      map(() => carId),
      catchError(() => of(Errors.OutdatedData)),
    )),
  ).pipe(
    share()
  );

  private readonly carUpdated$ = this.updateCar$$.pipe(
    switchMap(car =>
      this.dataService.updateCar(car).pipe(
        map(() => car),
        catchError(() => of(Errors.OutdatedData)),
      )
    )
  ).pipe(
    share()
  );

  private readonly carAdded$ = this.addCar$$.pipe(
    switchMap(car => this.dataService.addCar(car).pipe(
      switchMap(carId => this.dataService.getCarById(carId).pipe(
        catchError(() => of(Errors.CannotFetchData)),
      )),
      map(car => car ?? Errors.EmptyResponse),
      catchError(() => of(Errors.OutdatedData)),
    ))
  ).pipe(
    share()
  );

  private readonly userAdded$ = this.addUser$$.pipe(
    switchMap(user => this.dataService.addUser(user).pipe(
      switchMap(userId => this.dataService.getUserById(userId).pipe(
        catchError(() => of(Errors.CannotFetchData)),
      )),
      map(user => user ?? Errors.EmptyResponse),
      catchError(() => of(Errors.OutdatedData)),
    ))
  ).pipe(
    share()
  );

  private readonly userUpdated$ = this.updateUser$$.pipe(
    switchMap(user =>
      this.dataService.updateUser(user).pipe(
        map(() => user),
        catchError(() => of(Errors.OutdatedData)),
      )
    )
  ).pipe(
    share()
  );

  private readonly userRemoved$: Observable<Errors | [string, Car[]]> = this.removeUser$$.pipe(
    switchMap(user => this.dataService.deleteUser(user).pipe(
      switchMap(() => this.dataService.getCarsByUserId(user.id).pipe(
        map(cars => {
          const x: [string, Car[]] = [user.id, cars];
          return x;
        }),
        catchError(() => of(Errors.CannotFetchData)),
      )))),
    catchError(() => of(Errors.OutdatedData)),
  ).pipe(
    share()
  );

  private readonly carRemovedFromUser$ = this.removeCarFromUser$$.pipe(
    switchMap(({ carId, userId }) => this.dataService.unassignCarFromUser(userId, carId).pipe(
      switchMap(() => this.dataService.getCarById(carId).pipe(
        map(car => car ? { car, userId } : Errors.EmptyResponse),
        catchError(() => of(Errors.CannotFetchData)),
      )),
      catchError(() => of(Errors.OutdatedData)),
    ))
  ).pipe(
    share()
  );

  private readonly carAssignedToUser$ = this.assignCarToUser$$.pipe(
    switchMap(({ carId, userId }) => this.dataService.assignCarToUser(userId, carId).pipe(
      switchMap(() => this.dataService.getCarById(carId).pipe(
        map(car => car ? { car, userId } : Errors.EmptyResponse),
        catchError(() => of(Errors.CannotFetchData)),
      )),
      catchError(() => of(Errors.OutdatedData)),
    ))
  ).pipe(
    share()
  );

  private readonly clients$ = merge(
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
      filter((arr): arr is [string, Car[]] => typeof arr !== 'number'),
      map(([userId]) => (clients: Client[]) => clients.filter(client => client.user.id !== userId))
    ),
    this.carRemovedFromUser$.pipe(
      filter((arg): arg is { car: Car, userId: string } => typeof arg !== 'number'),
      map(({ car, userId }) => (clients: Client[]) => clients.map(client => client.user.id === userId ? {
        user: client.user,
        cars: client.cars.filter(c => c.id !== car.id)
      } : client))
    ),
    this.carAssignedToUser$.pipe(
      filter((arg): arg is { car: Car, userId: string } => typeof arg !== 'number'),
      map(({ car, userId }) => (clients: Client[]) => clients.map(client => client.user.id === userId ? {
        user: client.user,
        cars: [...client.cars, car]
      } : client))
    ),
  ).pipe(
    scan((clients, modifier) => modifier(clients), this.initialClients),
    startWith(this.initialClients),
    shareReplay(1),
  );


  private readonly freeCars$ = merge(
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
      filter((arg): arg is { car: Car, userId: string } => typeof arg !== 'number'),
      map(({ car }) => (cars: Car[]) => cars.filter(c => c.id !== car.id))
    ),
    this.carRemovedFromUser$.pipe(
      filter((arg): arg is { car: Car, userId: string } => typeof arg !== 'number'),
      map(({ car }) => (cars: Car[]) => [...cars, car])
    ),
    this.userRemoved$.pipe(
      filter((arr): arr is [string, Car[]] => typeof arr !== 'number'),
      map(([, cars]) => (freeCars: Car[]) => [...freeCars, ...cars])
    ),
  ).pipe(
    scan((cars, modifier) => modifier(cars), this.initialFreeCars),
    startWith(this.initialFreeCars),
    shareReplay(1),
  );

  private readonly errors$ = merge(
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

  constructor(
    // MockDataService pretends to perform HTTP requests
    private readonly dataService: ReactiveFluxCacheService,
  ) {
    connectable(merge(this.clients$, this.freeCars$, this.errors$)).connect();
  }

  getAllClients$(): Observable<Client[]> {
    return this.clients$;
  }

  getAllFreeCars$(): Observable<Car[]> {
    return this.freeCars$;
  }

  refresh(): void {
    this.refresh$$.next();
  }

  getErrors$(): Observable<Errors> {
    return this.errors$;
  }

  addCar(car: Create<Car>): void {
    this.addCar$$.next(car);
  }

  updateCar(car: Car): void {
    this.updateCar$$.next(car);
  }

  removeCar(carId: string): void {
    this.removeCar$$.next(carId);
  }

  addUser(user: Create<User>): void {
    this.addUser$$.next(user);
  }

  updateUser(user: User): void {
    this.updateUser$$.next(user);
  }

  removeUser(user: User): void {
    this.removeUser$$.next(user);
  }

  assignCarToUser(carId: string, userId: string): void {
    this.assignCarToUser$$.next({ carId, userId });
  }

  removeCarFromUser(carId: string, userId: string): void {
    this.removeCarFromUser$$.next({ carId, userId });
  }
}

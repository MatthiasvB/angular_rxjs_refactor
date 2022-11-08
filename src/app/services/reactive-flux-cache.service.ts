import { Injectable } from '@angular/core';
import { BehaviorSubject, delay, distinctUntilChanged, first, map, Observable, of, share, Subject, throwError } from 'rxjs';
import { Car, Create, State, User } from '../shared/types';
import { createUUID } from '../shared/utils';
import { initialCars, initialUsers } from './mock-data';
import { jumble } from './mock-data-jumbler';

@Injectable({
  providedIn: 'root'
})
export class ReactiveFluxCacheService {

  private readonly DELAY_TIME = 500;

  mockState: State = {
    users: initialUsers,
    cars: initialCars,
    userCarBindings: [],
  };

  private state$$ = new BehaviorSubject<State>(this.mockState);
  private errors$$ = new Subject<{ message: string }>();

  constructor() {
    setInterval(() => {
      this.state$$.pipe(first()).subscribe(state => {
        this.mockState = jumble(state);
        this.state$$.next(this.mockState);
      });
    }, 5_000);
  }

  addUser(user: Create<User>) {
    if (this.mockState.users.find(u => u.email === user.email)) {
      this.errors$$.next({ message: `User with email ${user.email} already exists` });
    }
    const id = createUUID();
    const newUser = { ...user, id };
    this.mockState.users = [...this.mockState.users, newUser];
  }

  updateUser(user: User) {
    this.mockState.users = this.mockState.users.map(usr => usr.id === user.id ? { ...user } : usr);
    this.state$$.next(this.mockState);
  }

  deleteUser(user: User) {
    this.mockState.users = this.mockState.users.filter(usr => usr.id !== user.id);
    this.mockState.userCarBindings = this.mockState.userCarBindings.filter(binding => binding.userId !== user.id);
    this.state$$.next(this.mockState);
  }

  addCar(car: Create<Car>) {
    const id = createUUID();
    const newCar = { ...car, id };
    this.mockState.cars = [...this.mockState.cars, newCar];
  }

  updateCar(car: Car) {
    this.mockState.cars = this.mockState.cars.map(c => c.id === car.id ? { ...car } : c);
    this.state$$.next(this.mockState);
  }

  deleteCar(id: string) {
    this.mockState.cars = this.mockState.cars.filter(car => car.id !== id);
    this.mockState.userCarBindings = this.mockState.userCarBindings.filter(binding => binding.carId !== id);
    this.state$$.next(this.mockState);
  }

  getCarsByUserId(userId: string) {
    const userCarBindings = this.mockState.userCarBindings.filter(binding => binding.userId === userId);
    const cars = userCarBindings.map(binding => this.mockState.cars.find(car => car.id === binding.carId)).filter((car): car is Car => !!car);
  }

  assignCarToUser(userId: string, carId: string) {
    const binding = this.mockState.userCarBindings.find(binding => binding.carId === carId);
    if (binding) {
      this.errors$$.next({ message: `Car with id ${carId} is already assigned to user with id ${binding.userId}` });
    }
    if (!this.mockState.users.find(user => user.id === userId)) {
      this.errors$$.next({ message: `User with id ${userId} does not exist` });
    }
    if (!this.mockState.cars.find(car => car.id === carId)) {
      this.errors$$.next({ message: `Car with id ${carId} does not exist` });
    }
    const id = createUUID();
    const newBinding = { id, userId, carId };
    this.mockState.userCarBindings = [...this.mockState.userCarBindings, newBinding];
    this.state$$.next(this.mockState);
  }

  unassignCarFromUser(userId: string, carId: string) {
    const length = this.mockState.userCarBindings.length;
    this.mockState.userCarBindings = this.mockState.userCarBindings.filter(binding => !(binding.userId === userId && binding.carId === carId));
    const newLength = this.mockState.userCarBindings.length;
    if (length === newLength) {
      this.errors$$.next({ message: 'Car is not assigned to user' });
    }
    this.state$$.next({ ...this.mockState });
  }

  unassignCarFromUserById(bindingId: string) {
    const length = this.mockState.userCarBindings.length;
    this.mockState.userCarBindings = this.mockState.userCarBindings.filter(binding => binding.id !== bindingId);
    const newLength = this.mockState.userCarBindings.length;
    if (length === newLength) {
      this.errors$$.next({ message: 'Binding not found' });
    }
    this.state$$.next({ ...this.mockState });
  }

  getAllUsersReactively$() {
    return this.state$$.pipe(
      map(state => state.users),
      distinctUntilChanged(),
      delay(this.DELAY_TIME),
      share()
    );
  }

  getAllCarsReactively$() {
    return this.state$$.pipe(
      map(state => state.cars),
      distinctUntilChanged(),
      delay(this.DELAY_TIME),
      share()
    );
  }

  getAllUserCarBindingsReactively$() {
    return this.state$$.pipe(
      map(state => state.userCarBindings),
      distinctUntilChanged(),
      delay(this.DELAY_TIME),
      share()
    );
  }

  getErrors$(): Observable<{ message: string }> {
    return this.errors$$;
  }
}

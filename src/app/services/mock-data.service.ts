import { Injectable } from '@angular/core';
import { BehaviorSubject, delay, distinctUntilChanged, first, map, of, throwError } from 'rxjs';
import { Car, Create, State, User } from '../shared/types';
import { createUUID } from '../shared/utils';
import { initialCars, initialUsers } from './mock-data';
import { jumble } from './mock-data-jumbler';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {

  private readonly DELAY_TIME = 500;

  mockState: State = {
    users: initialUsers,
    cars: initialCars,
    userCarBindings: [],
  };

  private state$$ = new BehaviorSubject<State>(this.mockState);

  constructor() {
    setInterval(() => {
      this.state$$.pipe(first()).subscribe(state => {
        this.mockState = jumble(state);
        this.state$$.next(this.mockState);
      });
      }, 5_000);
    }

  private delayedObs$<T>(data: T) {
      return of(data).pipe(delay(this.DELAY_TIME));
    }

  private error$(message: string) {
      return throwError(() => new Error(message));
    }

  getAllUsers() {
      return this.delayedObs$(this.mockState.users);
    }

  getUserById(id: string) {
      return this.delayedObs$(this.mockState.users.find(user => user.id === id));
    }

  addUser(user: Create<User>) {
      if(this.mockState.users.find(u => u.email === user.email)) {
      return this.error$(`User with email ${user.email} already exists`);
    }
    const id = createUUID();
    const newUser = { ...user, id };
    this.mockState.users = [...this.mockState.users, newUser];
    return this.delayedObs$(id);
  }

  updateUser(user: User) {
    if (!user.id) {
      this.error$('User has no id');
    }
    this.mockState.users = this.mockState.users.map(usr => usr.id === user.id ? { ...user } : usr);
    this.state$$.next(this.mockState);
    return this.delayedObs$({ ok: true });
  }

  deleteUser(user: User) {
    if (!user.id) {
      this.error$('User has no id');
    }
    this.mockState.users = this.mockState.users.filter(usr => usr.id !== user.id);
    this.mockState.userCarBindings = this.mockState.userCarBindings.filter(binding => binding.userId !== user.id);
    this.state$$.next(this.mockState);
    return this.delayedObs$({ ok: true });
  }

  getAllCars() {
    return this.delayedObs$([...this.mockState.cars]);
  }

  getCarById(id: string) {
    return this.delayedObs$(this.mockState.cars.find(car => car.id === id));
  }

  addCar(car: Create<Car>) {
    const id = createUUID();
    const newCar = { ...car, id };
    this.mockState.cars = [...this.mockState.cars, newCar];
    return this.delayedObs$(id);
  }

  updateCar(car: Car) {
    this.mockState.cars = this.mockState.cars.map(c => c.id === car.id ? { ...car } : c);
    this.state$$.next(this.mockState);
    return this.delayedObs$({ ok: true });
  }

  deleteCar(id: string) {
    this.mockState.cars = this.mockState.cars.filter(car => car.id !== id);
    this.mockState.userCarBindings = this.mockState.userCarBindings.filter(binding => binding.carId !== id);
    this.state$$.next(this.mockState);
    return this.delayedObs$({ ok: true });
  }

  getCarsByUserId(userId: string) {
    const userCarBindings = this.mockState.userCarBindings.filter(binding => binding.userId === userId);
    const cars = userCarBindings.map(binding => this.mockState.cars.find(car => car.id === binding.carId)).filter((car): car is Car => !!car);
    return this.delayedObs$([...cars]);
  }

  assignCarToUser$(userId: string, carId: string) {
    const binding = this.mockState.userCarBindings.find(binding => binding.carId === carId);
    if (binding) {
      return this.error$('Car is already assigned to a user');
    }
    if (!this.mockState.users.find(user => user.id === userId)) {
      return this.error$('User not found');
    }
    if (!this.mockState.cars.find(car => car.id === carId)) {
      return this.error$('Car not found');
    }
    const id = createUUID();
    const newBinding = { id, userId, carId };
    this.mockState.userCarBindings = [...this.mockState.userCarBindings, newBinding];
    this.state$$.next(this.mockState);
    return this.delayedObs$(id);
  }

  unassignCarFromUser(userId: string, carId: string) {
    const length = this.mockState.userCarBindings.length;
    this.mockState.userCarBindings = this.mockState.userCarBindings.filter(binding => !(binding.userId === userId && binding.carId === carId));
    const newLength = this.mockState.userCarBindings.length;
    if (length === newLength) {
      return this.error$('Car is not assigned to user');
    }
    this.state$$.next(this.mockState);
    return this.delayedObs$({ ok: true });
  }

  getUserCarBindingById(id: string) {
    const binding = this.mockState.userCarBindings.find(binding => binding.id === id);
    if (!binding) {
      return this.error$('Binding not found');
    }
    return this.delayedObs$({ ...binding });
  }

  unassignCarFromUserById(bindingId: string) {
    const length = this.mockState.userCarBindings.length;
    this.mockState.userCarBindings = this.mockState.userCarBindings.filter(binding => binding.id !== bindingId);
    const newLength = this.mockState.userCarBindings.length;
    if (length === newLength) {
      return this.error$('Binding not found');
    }
    this.state$$.next(this.mockState);
    return this.delayedObs$({ ok: true });
  }

  getState() {
    return this.delayedObs$({
      users: [...this.mockState.users],
      cars: [...this.mockState.cars],
      userCarBindings: [...this.mockState.userCarBindings],
    })
  }

  getAllUsersReactively$() {
    return this.state$$.pipe(
      map(state => state.users),
      distinctUntilChanged(),
      delay(this.DELAY_TIME),
    );
  }

  getAllCarsReactively$() {
    return this.state$$.pipe(
      map(state => state.cars),
      distinctUntilChanged(),
      delay(this.DELAY_TIME),
    );
  }

  getAllUserCarBindingsReactively$() {
    return this.state$$.pipe(
      map(state => state.userCarBindings),
      distinctUntilChanged(),
      delay(this.DELAY_TIME),
    );
  }
}

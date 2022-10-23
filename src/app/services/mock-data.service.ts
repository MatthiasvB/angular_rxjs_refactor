import { state } from '@angular/animations';
import { Injectable } from '@angular/core';
import { delay, of, throwError } from 'rxjs';
import { Car, State, User, UserCarBinding } from '../shared/types';
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

  constructor() {
    setInterval(() => {
      this.mockState = jumble(this.mockState)
    }, 1_000);
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

  addUser(user: User) {
    if (this.mockState.users.find(u => u.email === user.email)) {
      return this.error$(`User with email ${user.email} already exists`);
    }
    const id = createUUID();
    const newUser = { ...user, id };
    this.mockState.users.push(newUser);
    return this.delayedObs$(id);
  }

  updateUser(user: User) {
    if (!user.id) {
      this.error$('User has no id');
    }
    const index = this.mockState.users.findIndex(u => u.id === user.id);
    this.mockState.users[index] = user;
    return this.delayedObs$({ ok: true });
  }

  deleteUser(user: User) {
    if (!user.id) {
      this.error$('User has no id');
    }
    this.mockState.users = this.mockState.users.filter(usr => usr.id !== user.id);
    return this.delayedObs$({ ok: true });
  }

  getAllCars() {
    return this.delayedObs$([...this.mockState.cars]);
  }

  getCarById(id: string) {
    return this.delayedObs$(this.mockState.cars.find(car => car.id === id));
  }

  addCar(car: Car) {
    const id = createUUID();
    const newCar = { ...car, id };
    this.mockState.cars.push(newCar);
    return this.delayedObs$(id);
  }

  updateCar(car: Car) {
    const index = this.mockState.cars.findIndex(c => c.id === car.id);
    this.mockState.cars[index] = car;
    return this.delayedObs$({ ok: true });
  }

  deleteCar(id: string) {
    this.mockState.cars = this.mockState.cars.filter(car => car.id !== id);
    return this.delayedObs$({ ok: true });
  }

  getCarsByUserId(userId: string) {
    const userCarBindings = this.mockState.userCarBindings.filter(binding => binding.userId === userId);
    const cars = userCarBindings.map(binding => this.mockState.cars.find(car => car.id === binding.carId)).filter((car): car is Car => !!car);
    return this.delayedObs$([...cars]);
  }

  assignCarToUser(userId: string, carId: string) {
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
    this.mockState.userCarBindings.push(newBinding);
    return this.delayedObs$(id);
  }

  unassignCarFromUser(userId: string, carId: string) {
    const length = this.mockState.userCarBindings.length;
    this.mockState.userCarBindings = this.mockState.userCarBindings.filter(binding => !(binding.userId === userId && binding.carId === carId));
    const newLength = this.mockState.userCarBindings.length;
    if (length === newLength) {
      return this.error$('Car is not assigned to user');
    }
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
    return this.delayedObs$({ ok: true });
  }

  getState() {
    return this.delayedObs$({
      users: [...this.mockState.users],
      cars: [...this.mockState.cars],
      userCarBindings: [...this.mockState.userCarBindings],
    })
  }
}

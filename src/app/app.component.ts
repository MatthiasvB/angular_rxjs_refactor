import { Component } from '@angular/core';
import { MockDataService } from './services/mock-data.service';
import { Car, User, UserCarBinding } from './shared/types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  clients?: { user: User, cars: Car[] }[];
  freeCars?: Car[];

  selectedCar?: Car;
  selectedClient?: User;

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
    private readonly dataService: MockDataService,
  ) {
    this.refreshState();
  }

  private refreshState() {
    this.dataService.getState().subscribe(state => {
      this.clients = state.users.map(user => ({ user, cars: [] }));
      this.freeCars = state.cars;
      this.clients?.forEach(client => {
        if (!client.user.id) {
          return;
        }
        state.userCarBindings.forEach(binding => {
          if (binding.userId === client.user.id) {
            const car = state.cars.find(c => c.id === binding.carId);
            if (car) {
              const index = this.freeCars?.findIndex(c => c.id === car?.id);
              if (index !== undefined && index !== -1) {
                this.freeCars?.splice(index, 1);
              }
              client.cars.push(car);
            }
          }
        });
      });
    });
  }

  private assignCarIfPossible() {
    if (!this.selectedCar?.id || !this.selectedClient?.id) {
      return;
    }
    const [userId, carId] = [this.selectedClient.id, this.selectedCar.id];
    this.dataService.assignCarToUser(userId, carId).subscribe({
      next: bindingId => {
        const binding: UserCarBinding = {
          id: bindingId,
          userId,
          carId
        };
        this.clients?.forEach(client => {
          if (client.user.id === binding.userId) {
            const car = this.freeCars?.find(car => car.id === binding.carId);
            if (car) {
              client.cars.push(car);
            }
          }
        });
        this.freeCars = this.freeCars?.filter(car => car.id !== binding.carId);
      },
      error: err => {
        if (window.confirm("This car can not be assigned. Refresh the page?")) {
          this.refreshState();
        }
      }
    });
    this.selectedCar = undefined;
    this.selectedClient = undefined;
  }

  selectCar($event: Event, car: Car) {
    $event.stopPropagation();
    this.selectedCar = car;
    this.assignCarIfPossible();
  }

  selectClient($event: Event, client: User) {
    $event.stopPropagation();
    this.selectedClient = client;
    this.userForm = client;
    this.assignCarIfPossible();
  }

  removeCarFromUser($event: MouseEvent, car: Car, user: User) {
    $event.stopPropagation();
    if (!user.id || !car.id) {
      return;
    }
    this.dataService.unassignCarFromUser(user.id, car.id).subscribe({
      next: () => {
        this.clients?.forEach(client => {
          if (client.user.id === user.id) {
            client.cars = client.cars.filter(c => c.id !== car.id);
            this.freeCars?.push(car);
          }
        })
      },
      error: err => {
        if (window.confirm("This car can not be unassigned. Refresh the page?")) {
          this.refreshState();
        }
      }
    });
  }

  userSubmit($event: Event) {
    $event.stopPropagation();
    const { firstName, lastName, email } = this.userForm;
    this.userForm = { firstName: '', lastName: '', email: '' };
    if (!firstName || !lastName || !email) {
      return;
    }
    if (this.selectedClient?.id) {
      const clientId = this.selectedClient.id;
      this.dataService.updateUser({ id: this.selectedClient.id, firstName, lastName, email }).subscribe({
        next: () => {
          const clientIndex = this.clients?.findIndex(client => client.user.id === this.selectedClient?.id);
          if (clientIndex !== undefined && clientIndex !== -1 && this.clients) {
            this.clients[clientIndex] = {
              user: { id: clientId, firstName, lastName, email },
              cars: this.clients[clientIndex].cars || []
            }
          }
        },
        error: err => {
          if (window.confirm("This user can not be updated. Refresh the page?")) {
            this.refreshState();
          }
        }
      });
    }
    this.dataService.addUser({ firstName, lastName, email }).subscribe({
      next: id => {
        this.clients?.push({ user: { id, firstName, lastName, email }, cars: [] });
      },
      error: err => {
        window.alert("This user can not be created.");
      }
    });
  }

  userRemove($event: Event) {
    $event.stopPropagation();
    const removeId = this.selectedClient?.id;
    if (!removeId || !this.selectedClient) {
      return;
    }
    this.dataService.deleteUser(this.selectedClient).subscribe({
      next: () => {
        this.dataService.getAllUsers().subscribe(users => {
          this.clients = users.map(user => ({ user, cars: [] }));
          this.clients?.forEach(client => {
            if (!client.user.id) {
              return;
            }
            this.dataService.getCarsByUserId(client.user.id).subscribe(cars => {
              client.cars = cars;
            });
          });
        });
      },
      error: err => {
        if (window.confirm("This user can not be deleted. Refresh the page?")) {
          this.refreshState();
        }
      }
    });
    this.selectedClient = undefined;
  }

  carSubmit($event: Event) {
    $event.stopPropagation();
    const { make, model, year } = this.carForm;
    this.carForm = { make: '', model: '', year: '' };
    if (!make || !model || !year) {
      return;
    }
    this.dataService.addCar({ make, model, year: +year }).subscribe({
      next: id => {
        this.freeCars?.push({ id, make, model, year: +year });
      },
      error: err => {
        window.alert("This car can not be created.");
      }
    });
  }

  carRemove($event: Event) {
    $event.stopPropagation();
    const removeId = this.selectedCar?.id;
    if (!removeId || !this.selectedCar) {
      return;
    }
    this.selectedCar = undefined;
    this.dataService.deleteCar(removeId).subscribe({
      next: () => {
        this.freeCars = this.freeCars?.filter(car => car.id !== removeId);
      },
      error: err => {
        if (window.confirm("This car can not be deleted. Refresh the page?")) {
          this.refreshState();
        }
      }
    });
  }

  stopPropagation($event: Event) {
    $event.stopPropagation();
  }

  unselectAll() {
    this.userForm = { firstName: '', lastName: '', email: '' };
    this.carForm = { make: '', model: '', year: '' };
    this.selectedCar = undefined;
    this.selectedClient = undefined;
  }
}

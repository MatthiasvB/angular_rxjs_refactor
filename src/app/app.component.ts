import { Component } from '@angular/core';
import { MockDataService } from './services/mock-data.service';
import { Car, User, UserCarBinding } from './shared/types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  /*
   * Should these two fields really be optional?
   * Sure, we can't initialize them immediately, but 
   * our component can't work without them.
   * 
   * Marking them as optional is a workaround for a 
   * technical problem at component initialization.
   * 
   * But we'll have to work around this all the time.
   * 
   * With arrays, it's usually save to just initialize
   * them with an empty array. But what about objects or primitives?
   * 
   * We really need to find a better solution.
   */
  clients?: { user: User, cars: Car[] }[];
  freeCars?: Car[];

  /*
   * These are truly optional.
   */
  selectedCar?: Car;
  selectedClient?: User;


  /*
   * And here the intial values are clear, so we can
   * initialize them immediately.
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
    this.refreshState();
  }
  
  /*
   * We have a problem: The data layout in the "backend"
   * is different from the data layout in the frontend.
   * 
   * We need to transform the data from the backend to
   * the data layout we need in the frontend.
   * 
   * We can do this in the component, but it's better
   * to do it in a service.
   * 
   * Unfortunately, this is not the case, because our dataService
   * is just a thin wrapper around the HTTP-client. That's why our component
   * does way too much work.
   */
  refreshState() {
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
      /*
       * Why do we need to check for the presence of the id?
       * 
       * It should be impossible to select a car or a client
       * without an id.
       * 
       * But we can't be sure, because the id is optional.
       * 
       * Why is it optional? 
       * 
       * Because we are lazy and think it
       * is easier to work with optional fields than to create 
       * a separate type for the "full version" of the object
       * and the "creation version" of the object, which can't have
       * an ID, because IDs are typically created in the backend.
       */
      return;
    }

    /*
     * Why do we need to save userId and carId in local variables?
     *
     * Because we can't be sure that the values of this.selectedCar.id
     * and this.selectedClient.id won't change while the HTTP request
     * is in flight.
     * 
     * This is a problem that we can't solve with types. Typescript is right
     * to call it out. But there are cases where our lazy types will
     * make it harder for us than necessary.
     */
    const [userId, carId] = [this.selectedClient.id, this.selectedCar.id];
    /*
     * This is were it gets BAD.
     * 
     * What we have here, is an unhandled subscription.
     * 
     * When we subscribe to an observable, we register a callback
     * that will be called when the observable emits a value.
     * 
     * Every single time, until the observable completes, errors or
     * we unsubscribe.
     * 
     * This means that if we subscribe to an observable, we have to
     * make sure to unsubscribe from it when we don't need it anymore.
     * 
     * Otherwise, we will have memory leaks.
     * 
     * But we can't unsubscribe from it, because we don't have a reference
     * to the subscription.
     * 
     * HERE, this is fine, because IF we KNOW that this is in fact a HTTP request,
     * we can be sure that the Observable will complete, because the HTTP request
     * will complete.
     * 
     * But this is not always the case. Adapting this style of programming to
     * other types of Observables will lead to memory leaks. And if the service
     * changes, we may not even notice that now the Observable doesn't complete.
     * 
     * We need to find a better solution.
     */
    this.dataService.assignCarToUser(userId, carId).subscribe({
      // again, too much work for a component
      next: bindingId => {
        const binding: UserCarBinding = {
          id: bindingId,
          userId,
          carId
        };
        this.clients?.forEach(client => {
          if (client.user.id === binding.userId) {
            // Why the elvis operator "?."? Because we were lazy and marked the field as optional.
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
      /*
       * Why is this check necessary? 
       * 
       * Because we were lazy and marked the IDs of perfectly fine
       * users and cars as optional. But they're not optional.
       * 
       * The only time they are optional is when we create a new user
       * or a new car. But in this case we are not creating a new user
       * or a new car. We are removing a car from a user.
       * 
       * So we can be sure that the IDs are present.
       * 
       * But we can't be sure, because we were lazy and marked them as optional.
       * 
       * We shouldn't be that lazy.
       * 
       * Being that lazy hides intent, and makes it harder to understand
       * what is going on. This leads to bugs. Those we dislike.
       */
      return;
    }
    // Unhandled subscription, again!
    this.dataService.unassignCarFromUser(user.id, car.id).subscribe({
      next: () => {
        // Clients shouldn't be optional
        this.clients?.forEach(client => {
          if (client.user.id === user.id) {
            client.cars = client.cars.filter(c => c.id !== car.id);
            /* 
             * Programming style that isn't immutable
             * 
             * This will make it harder to switch to a different
             * change detection strategy, because we will have to
             * make sure that the change detection strategy is
             * aware of the fact that we are mutating the array.
             * 
             * This is not the case with immutable data structures.
             * 
             * We could just replace the array with a new array.
             */
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
      /*
       * Yes, we should have used form validation.
       * 
       * But this is out of scope for this example.
       */
      return;
    }
    if (this.selectedClient?.id) {
      const clientId = this.selectedClient.id;
      // Unhandled subscription, again!
      this.dataService.updateUser({ id: this.selectedClient.id, firstName, lastName, email }).subscribe({
        next: () => {
          // Again, too much work for a component
          const clientIndex = this.clients?.findIndex(client => client.user.id === this.selectedClient?.id);
          /* 
           * Again, checking for the presence of the clients-array is unnessesary work.
           *
           * We only do it to make TypeScript narrow the type of `this.clients`.
           * 
           * That means that we do run-time work to fix a compile-time problem.
           * 
           * Not good.
           */
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
    // Unhandled subscription, again!
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
    // Unhandled subscription, again!
    this.dataService.deleteUser(this.selectedClient).subscribe({
      next: () => {
        /* 
         * Unhandled subscription, inside another subscription.
         * 
         * Subscriptions inside subscriptions are an anti-pattern, because
         * they can very easily lead to memory leaks, and are always avoidable.
         * 
         * In fact, using this pattern is a sign that the programmer doesn't
         * understand the "Observable philosophy".
         * 
         * It is common to see this pattern in code that was written by people
         * who are used to working with Promises, and are now forced to use Observables.
         * So they study the API and try to find a way to use it in a way that
         * is similar to how they used Promises.
         * 
         * But the whole point of Observables is that they are much more powerful,
         * and have to be applied in a radically different way.
         * 
         * In fact, code that properly uses Observables looks very different from
         * code that uses Promises.
         * 
         * The best way to learn how to use Observables is to strictly avoid
         * typical anti-patterns, even if it is not strictly necessary. This is
         * one such anti-pattern.
         */
        this.dataService.getAllUsers().subscribe(users => {
          this.clients = users.map(user => ({ user, cars: [] }));
          // ...
          this.clients?.forEach(client => {
            if (!client.user.id) {
              // ...
              return;
            }
            // Unhandled subscription, inside another subscription, inside another subscription.
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
    // Unhandled subscription, again!
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
    // Unhandled subscription, again!
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

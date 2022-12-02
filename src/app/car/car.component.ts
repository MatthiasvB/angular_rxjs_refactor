import { Component, EventEmitter, Input, Output } from '@angular/core';
import { first, Observable, Subject } from 'rxjs';
import { Car, Create } from '../shared/types';

@Component({
  selector: 'app-car',
  templateUrl: './car.component.html',
  styleUrls: ['./car.component.scss']
})
export class CarComponent {

  @Output()
  public readonly onCarSubmit = new EventEmitter<Create<Car>>();

  @Output()
  public readonly onCarRemove = new EventEmitter<string>();

  private readonly cars$$ = new Subject<Car[]>();
  public readonly cars$: Observable<Car[]> = this.cars$$;
  @Input()
  set cars(cars: Car[] | null) {
    if (cars) this.cars$$.next(cars);
  }

  private readonly selectedCar$$ = new Subject<Car | undefined>();
  public readonly selectedCar$: Observable<Car | undefined> = this.selectedCar$$;

  carForm = {
    make: '',
    model: '',
    year: ''
  }

  constructor() { }

  stopPropagation($event: Event) {
    $event.stopPropagation();
  }

  selectCar($event: Event, car: Car) {
    $event.stopPropagation();
    this.selectedCar$$.next(car);
  }

  submitCar($event: Event) {
    $event.stopPropagation();
    const { make, model, year } = this.carForm;
    if (!make || !model || !year) {
      return;
    }
    this.onCarSubmit.emit({ make, model, year: +year })
    this.carForm = { make: '', model: '', year: '' };
  }

  removeCar($event: Event) {
    $event.stopPropagation();
    this.selectedCar$.pipe(first()).subscribe(car => {
      if (car) {
        this.onCarRemove.emit(car.id);
        this.selectedCar$$.next(undefined);
      }
    });
  }
}

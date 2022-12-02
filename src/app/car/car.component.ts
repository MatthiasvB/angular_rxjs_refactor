import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { first, map, mergeAll, Observable, queueScheduler, scheduled, shareReplay, Subject, Subscription, switchMap } from 'rxjs';
import { Car, Create } from '../shared/types';

@Component({
  selector: 'app-car',
  templateUrl: './car.component.html',
  styleUrls: ['./car.component.scss']
})
export class CarComponent implements OnDestroy {

  @Output()
  public readonly onCarSubmit = new EventEmitter<Create<Car>>();

  @Output()
  public readonly onCarRemove = new EventEmitter<string>();

  @Output()
  public readonly onSelectCar = new EventEmitter<Car | undefined>();

  private readonly cars$$ = new Subject<Car[]>();
  public readonly cars$: Observable<Car[]> = this.cars$$;
  @Input()
  set cars(cars: Car[] | null) {
    if (cars) this.cars$$.next(cars);
  }

  private readonly unselect$$ = new Subject<Observable<void>>();
  @Input()
  set unselect$(unselect$: Observable<void> | null) {
    if (unselect$) this.unselect$$.next(unselect$);
  }

  private readonly selectedCar$$ = new Subject<Car | undefined>();
  public readonly selectedCar$: Observable<Car | undefined> = scheduled([
    this.selectedCar$$,
    this.unselect$$.pipe(switchMap(unselect$ => unselect$), map(() => undefined))
  ], queueScheduler).pipe(
    mergeAll(),
    shareReplay(1)
  )
    

  carForm = {
    make: '',
    model: '',
    year: ''
  }

  private readonly subscriptions = new Subscription();

  constructor() {
    this.subscriptions.add(
      this.selectedCar$.subscribe(car => this.onSelectCar.emit(car))
    )
  }

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

  ngOnDestroy(): void {
      this.subscriptions.unsubscribe();
  }
}

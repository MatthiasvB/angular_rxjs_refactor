import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { first, map, mergeAll, Observable, queueScheduler, scheduled, share, shareReplay, Subject, Subscription, switchMap } from 'rxjs';
import { Car, Client, Create, User } from '../shared/types';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnDestroy {

  @Output()
  public readonly onRemoveCarFromUser = new EventEmitter<{ userId: string; carId: string }>();

  @Output()
  public readonly onAddUser = new EventEmitter<Create<User>>();

  @Output()
  public readonly onEditUser = new EventEmitter<User>();

  @Output()
  public readonly onRemoveUser = new EventEmitter<User>();

  @Output()
  public readonly onSelectUser = new EventEmitter<User | undefined>();

  private readonly selectedClient$$ = new Subject<User | undefined>();

  private readonly clients$$ = new Subject<Client[]>();
  public readonly clients$: Observable<Client[]> = this.clients$$;
  @Input()
  set clients(clients: Client[] | null) {
    if (clients) this.clients$$.next(clients);
  }

  private readonly unselect$$ = new Subject<Observable<void>>();
  @Input()
  set unselect$(unselect$: Observable<void> | null) {
    if (unselect$) this.unselect$$.next(unselect$);
  }

  public readonly selectedClient$: Observable<User | undefined> = scheduled([
    this.selectedClient$$,
    this.unselect$$.pipe(switchMap(unselect$ => unselect$), map(() => undefined))
  ], queueScheduler).pipe(
    mergeAll(),
    shareReplay(1)
  );
  
  userForm = {
    firstName: '',
    lastName: '',
    email: ''
  };

  private readonly subscriptions = new Subscription();

  constructor() {
    this.subscriptions.add(
      this.selectedClient$.subscribe(user => {
        if (user) {
          this.userForm = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          };
        } else {
          this.userForm = { firstName: '', lastName: '', email: '' };
        }
      })
    );

    this.subscriptions.add(
      this.selectedClient$.subscribe(user => this.onSelectUser.emit(user))
    );
  }

  selectClient($event: Event, user: User) {
    $event.stopPropagation();
    this.selectedClient$$.next(user);
  }

  removeCarFromUser($event: MouseEvent, car: Car, user: User) {
    $event.stopPropagation();
    this.onRemoveCarFromUser.emit({ userId: user.id, carId: car.id });
    this.selectedClient$$.next(undefined);
  }

  submitUser($event: Event) {
    $event.stopPropagation();
    const { firstName, lastName, email } = this.userForm;
    if (!firstName || !lastName || !email) {
      return;
    }
    this.selectedClient$.pipe(first()).subscribe(user => {
      if (user) {
        this.onEditUser.emit({ ...user, firstName, lastName, email })
      } else {
        this.onAddUser.emit({ firstName, lastName, email })
      }
      this.selectedClient$$.next(undefined);
    });
    this.userForm = { firstName: '', lastName: '', email: '' };
  }

  removeUser($event: Event) {
    $event.stopPropagation();
    this.selectedClient$.pipe(first()).subscribe(user => {
      if (user) {
        this.onRemoveUser.emit(user);
        this.selectedClient$$.next(undefined);
      }
    });
  }

  stopPropagation($event: Event) {
    $event.stopPropagation();
  }

  ngOnDestroy(): void {
      this.subscriptions.unsubscribe();
  }
}

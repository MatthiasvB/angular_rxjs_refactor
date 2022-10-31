export interface User {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
}

export interface Car {
    id: string;
    make: string;
    model: string;
    year: number;
}

export interface Client {
    user: User;
    cars: Car[];
}

export interface UserCarBinding {
    id: string,
    userId: string;
    carId: string;
}

export interface State {
    users: User[];
    cars: Car[];
    userCarBindings: UserCarBinding[];
}

export type Create<T extends { id: string }> = Omit<T, 'id'>;
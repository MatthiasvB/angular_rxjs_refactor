import { Car, User } from "../shared/types";

export const initialUsers: User[] = [
    {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
    },
    {
        id: '2',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
    },
    {
        id: '3',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@yahoo.com',
    },
    {
        id: '4',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@gmx.de',
    },
];

export const initialCars: Car[] = [
    {
        id: '1',
        make: 'BMW',
        model: 'M3',
        year: 2018,
    },
    {
        id: '2',
        make: 'BMW',
        model: 'M5',
        year: 2019,
    },
    {
        id: '3',
        make: 'Audi',
        model: 'A4',
        year: 2017,
    },
    {
        id: '4',
        make: 'Audi',
        model: 'A6',
        year: 2018,
    },
    {
        id: '5',
        make: 'Mercedes',
        model: 'C 200',
        year: 2018,
    },
    {
        id: '6',
        make: 'Mercedes',
        model: 'C 300',
        year: 2019,
    },
    {
        id: '7',
        make: 'Mercedes',
        model: 'E 200',
        year: 2017,
    },
    {
        id: '8',
        make: 'Mercedes',
        model: 'E 300',
        year: 2018,
    },
];

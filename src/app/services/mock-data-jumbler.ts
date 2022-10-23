import { Car, State, UserCarBinding } from "../shared/types";
import { createUUID } from "../shared/utils";

export function jumble(state: State): State {
    const random = Math.random();
    if (random < 0.1) {
        return jumbleUserCarBindings(state);
    } else if (random < 0.2) {
        return jumbleUsers(state);
    } else if (random < 0.3) {
        return jumbleCars(state);
    } else {
        return state;
    }
}

function addProbablity(targetLength: number, currentLength: number, otherPobsSum: number) {
    return (targetLength - currentLength) / targetLength * (1 - otherPobsSum);
}

function removeProbablity(targetLength: number, currentLength: number, otherPobsSum: number) {
    return 1 - addProbablity(targetLength, currentLength, otherPobsSum) - otherPobsSum;
}

function pickRandom<T>(array: T[]): T | undefined {
    return array[Math.floor(Math.random() * array.length)];
}

function jumbleUserCarBindings(state: State): State {
    const newState = { ...state };
    const random = Math.random();
    if (random < addProbablity(5, state.userCarBindings.length, 0)) {
        // Add a new binding
        const user = pickRandom(state.users);
        const car = pickRandom(state.cars);
        if (!user?.id || !car?.id) {
            return state;
        }
        const binding: UserCarBinding = {
            id: createUUID(),
            userId: user.id,
            carId: car.id
        };
        newState.userCarBindings.push(binding);
    } else {
        // Remove a random binding
        const binding = pickRandom(state.userCarBindings);
        const index = newState.userCarBindings.findIndex(b => b.id === binding?.id);
        if (index !== -1) {
            newState.userCarBindings.splice(index, 1);
        }
    }
    return newState;
}

const firstNames = [
    "John",
    "Jane",
    "Bob",
    "Alice",
    "Peter",
    "Paul",
    "Mary",
    "Mark",
    "Luke",
    "Andrew",
    "James",
    "Joseph",
    "David",
    "Samuel",
    "Daniel",
    "Matthew",
    "Joshua",
    "Jacob",
    "Ethan",
    "Noah",
    "Michael",
    "Christopher",
    "Andrew",
    "Joseph",
    "William",
    "Alexander",
    "Ryan",
];

const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Jones",
    "Brown",
    "Davis",
    "Miller",
    "Wilson",
    "Moore",
    "Taylor",
    "Anderson",
    "Thomas",
    "Jackson",
    "White",
    "Harris",
    "Martin",
    "Thompson",
    "Garcia",
    "Martinez",
    "Robinson",
    "Clark",
    "Rodriguez",
    "Lewis",
    "Lee",
    "Walker",
    "Hall",
    "Allen",
    "Young",
    "Hernandez",
];

const domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "gmx.de", "web.de", "aol.com"];


function jumbleUsers(state: State): State {
    const newState = { ...state };
    newState.users = [...newState.users];
    const random = Math.random();
    if (random < addProbablity(10, state.users.length, 0.33)) {
        // Add a new user
        const firstName = pickRandom(firstNames)!;
        const lastName = pickRandom(lastNames)!;
        const user = {
            id: createUUID(),
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${pickRandom(domains)}`,
        };
        newState.users.push(user);
    } else if (random < addProbablity(10, state.users.length, 0.33) + removeProbablity(10, state.users.length, 0.33)) {
        // Remove a random user
        const user = pickRandom(state.users);
        const index = newState.users.findIndex(u => u.id === user?.id);
        if (index !== -1) {
            newState.users.splice(index, 1);
        }
        newState.userCarBindings = newState.userCarBindings.filter(b => b.userId !== user?.id);
    } else {
        // Update a random user
        const user = pickRandom(state.users);
        const index = newState.users.findIndex(u => u.id === user?.id);
        newState.users[index] = { ...newState.users[index] };
        if (index !== -1) {
            const random2 = Math.random();
            if (random2 < 0.5) {
                newState.users[index].firstName = pickRandom(firstNames)!;
            } else {
                newState.users[index].lastName = pickRandom(lastNames)!;
            }
            newState.users[index].email = `${newState.users[index].firstName.toLowerCase()}.${newState.users[index].lastName.toLowerCase()}@${pickRandom(domains)}`;
        }
    }
    return newState;
}

const makesAndModels = [
    {
        make: "BMW",
        models: ["3er", "5er", "7er", "X1", "X3", "X5", "X6", "Z4"]
    },
    {
        make: "Mercedes",
        models: ["A-Klasse", "B-Klasse", "C-Klasse", "E-Klasse", "S-Klasse", "GLA", "GLC", "GLE", "GLS", "SLK", "SLC", "SLR", "SL"]
    },
    {
        make: "Audi",
        models: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "R8"]
    },
    {
        make: "Volkswagen",
        models: ["Golf", "Passat", "Tiguan", "Touareg", "Polo", "T-Roc", "T-Cross", "Arteon"]
    },
    {
        make: "Porsche",
        models: ["911", "Panamera", "Cayenne", "Macan", "Taycan"]
    },
    {
        make: "Ford",
        models: ["Fiesta", "Focus", "Mondeo", "Mustang", "Kuga", "Edge", "Explorer", "Fusion"]
    },
    {
        make: "Opel",
        models: ["Corsa", "Astra", "Insignia", "Mokka", "Grandland X", "Crossland X"]
    },
    {
        make: "Renault",
        models: ["Clio", "Megane", "Kadjar", "Captur", "Talisman", "Zoe"]
    },
    {
        make: "Fiat",
        models: ["500", "Panda", "Tipo", "Punto", "Doblo", "500X"]
    },
    {
        make: "Peugeot",
        models: ["208", "308", "3008", "5008", "2008", "508"]
    },
    {
        make: "Citroen",
        models: ["C3", "C4", "C5", "C3 Aircross", "C4 Cactus", "C4 SpaceTourer"]
    },
    {
        make: "Seat",
        models: ["Ibiza", "Leon", "Ateca", "Alhambra", "Tarraco"]
    },
    {
        make: "Skoda",
        models: ["Fabia", "Octavia", "Kodiaq", "Superb", "Karoq", "Kamiq"]
    },
    {
        make: "Mazda",
        models: ["2", "3", "6", "CX-3", "CX-5", "CX-30", "MX-5"]
    },
    {
        make: "Toyota",
        models: ["Yaris", "Auris", "Corolla", "Avensis", "Camry", "RAV4", "C-HR", "Prius"]
    },
    {
        make: "Nissan",
        models: ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "Pulsar"]
    },
    {
        make: "Honda",
        models: ["Jazz", "Civic", "CR-V", "HR-V", "Accord"]
    },
    {
        make: "Hyundai",
        models: ["i10", "i20", "i30", "i40", "Kona", "Tucson", "Santa Fe"]
    },
    {
        make: "Kia",
        models: ["Picanto", "Rio", "Ceed", "Stinger", "Sportage", "Niro", "Sorento"]
    },
    {
        make: "Suzuki",
        models: ["Swift", "Jimny", "Ignis", "S-Cross", "Vitara", "SX4 S-Cross"]
    },
    {
        make: "Mitsubishi",
        models: ["ASX", "Eclipse Cross", "Outlander", "Outlander PHEV", "L200"]
    },
    {
        make: "Volvo",
        models: ["V40", "V60", "V90", "XC40", "XC60", "XC90"]
    },
    {
        make: "Mini",
        models: ["Cooper", "Cooper S", "Cooper D", "Cooper SD", "Cooper SE", "Cooper JCW"]
    },
    {
        make: "Jaguar",
        models: ["XE", "XF", "XJ", "F-Pace", "F-Type"]
    },
    {
        make: "Land Rover",
        models: ["Discovery", "Discovery Sport", "Range Rover Evoque", "Range Rover Velar", "Range Rover Sport", "Range Rover"]
    },
    {
        make: "Alfa Romeo",
        models: ["Giulia", "Stelvio", "Giulietta", "Mito", "4C"]
    },
    {
        make: "Dacia",
        models: ["Sandero", "Logan", "Duster", "Dokker", "Lodgy", "Lodgy Stepway"]
    },
    {
        make: "Lexus",
        models: ["CT", "IS", "NX", "RX", "UX"]
    },
    {
        make: "Subaru",
        models: ["Impreza", "Forester", "Outback", "Legacy", "WRX STI"]
    },
    {
        make: "Tesla",
        models: ["Model 3", "Model S", "Model X", "Model Y"]
    },
    {
        make: "Smart",
        models: ["ForTwo", "ForFour"]
    },
    {
        make: "Maserati",
        models: ["Ghibli", "Levante", "Quattroporte"]
    },
    {
        make: "Lamborghini",
        models: ["Aventador", "Huracan"]
    },
    {
        make: "Aston Martin",
        models: ["DB11", "DBS Superleggera", "Vantage", "Rapide E"]
    },
    {
        make: "Bentley",
        models: ["Continental", "Flying Spur", "Bentayga"]
    },
    {
        make: "Bugatti",
        models: ["Chiron", "Divo", "Chiron Super Sport 300+", "Chiron Pur Sport"]
    },
    {
        make: "Rolls-Royce",
        models: ["Ghost", "Wraith", "Cullinan"]
    },
    {
        make: "McLaren",
        models: ["570S", "720S", "Senna", "GT"]
    },
];

const colors = ["Black", "White", "Silver", "Grey", "Red", "Blue", "Green", "Yellow", "Brown", "Orange", "Purple", "Pink", "Beige", "Gold", "Other"];

function jumbleCars(state: State): State {
    const random = Math.random();
    if (random < addProbablity(10, state.cars.length, 0)) {
        // add car
        const make = pickRandom(makesAndModels)!;
        const model = pickRandom(make.models)!;
        const car: Car = {
            id: createUUID(),
            make: make.make,
            model,
            year: Math.floor(Math.random() * 22) + 2000,
        };
        return {
            ...state,
            cars: [...state.cars, car],
        };
    } else {
        // remove car
        if (state.cars.length === 0) {
            return state;
        }
        const index = Math.floor(Math.random() * state.cars.length);
        const car = state.cars[index];
        const newState = {
            ...state,
            cars: state.cars.filter((c, i) => i !== index),
        };
        newState.userCarBindings = state.userCarBindings.filter((binding) => binding.carId !== car.id);
        return newState;
    }
}
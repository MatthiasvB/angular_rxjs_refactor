# AngularRxjsRefactor

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 14.2.6.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Project objective

Using the popular library RxJS, which is heavily integrated into Angular, properly, requires more than studying the docs. It fundamentally changes the way we think about events, state, and how the two interact. Proper &hyphen; functional &hyphen; RxJS code looks nothing like Promise-based or imperative code. 

Learning to code this way is not easy. The docs will tell you all about Operators, Schedulers, Subjects etc., but they can not convey the bigger picture of how to apply these concepts in a meaningful way.

Even questions on StackOverflow often do not show good code, but quick fixes. To decide what good RxJS code looks like, you need to know the architecture of the project in which it is applied &hyphen; that's difficult to do in a minimal working example.

So how did I learn to code RxJS? Really good advice from my team lead, and 6 months work on a PoC for what I came to call <q>radical reactivity</q>.

Since then, I'm fixing other projects.

I have seen many mistakes beginners make as they start out with RxJS. Usually as they start to learn Angular. Now, I'm carrying on the torch to teach people how to do better.

This project is divided into several branches that show different levels of code quality, starting from what I'm used to seeing in beginners projects, to the fully refactored version which I consider optimal RxJS.

All branches provide the same functionality, so you can execute the app and make experiments.

## Branches
### `naive-implementation`
This is the branch that tries to reproduce typical beginners code:
- Less than optimal types
- A service for backend communication that is just a thin wrapper around the http-client
- Lot's of RxJS anti-patterns (typically looks like Promise-based code done with Observables)

### `highlight-problems`
Same as `naive-implementation`, but with lots of comments explaining what is wrong, and why.


### `refactor-component`
Refactored the component to use proper RxJS. Done under the assumption that the service level can't be touched.

This code is very complex, much more so than necessary if we allowed ourselves to improve the app on a more fundamental level. But you can see a lot of examples of how good RxJS code is structured by composition, becoming &hyphen; with some experience &hyphen; very easy to read.

### `move-to-service`
Extracts all complicated state management from the component into a new service, allowing the component to manage only it's inherent complexity. The (managed) state becomes reusable for other components.

### `reactive-flux-cache`
This branch assumes that our service has a real-time data update mechanism with the backend. State is at most as <q>old</q> as your ping. No need to refresh the state &hyphen; ever. 

We also assume that the backend API has changed, and the data we receive becomes easier to integrate into our state. A real application may introduce further optimizations, but this is out of scope for this project.
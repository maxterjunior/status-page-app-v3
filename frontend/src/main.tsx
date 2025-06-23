import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <App />
)


// import { GreetService } from "./bindings/changeme";
// import { Events } from "@wailsio/runtime";

// const resultElement = document.getElementById("result");
// const timeElement = document.getElementById("time");

// window.doGreet = () => {
//   let name = document.getElementById("name").value;
//   if (!name) {
//     name = "anonymous";
//   }
//   GreetService.Greet(name)
//     .then((result) => {
//       resultElement.innerText = result;
//     })
//     .catch((err) => {
//       console.log(err);
//     });
// };

// Events.On("time", (time) => {
//   timeElement.innerText = time.data;
// });

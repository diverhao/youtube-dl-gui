import React from "react";
import ReactDOM from "react-dom/client";


let root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

console.log("hahah");
// ReactDOM.render(document.getElementById("root"), <h1>Helloworld React!</h1>);
// const root = ReactDOM.createRoot(document.getElementById("root"));
// const element = <h1>Hello, world</h1>;
// root.render(element);

const App = () => {
    return <h1>abc </h1>;
}


root.render(<App />);

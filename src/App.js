import React, { Component } from "react";
import "./App.css";
import DWT from "./DynamsoftSDK";

class App extends Component {
  render() {
    return (
      <div className="App">
        <br />
        <DWT features={["scan", "save"]} />
      </div>
    );
  }
}

export default App;

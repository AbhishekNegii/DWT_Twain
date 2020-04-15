import React, { Component } from 'react';
import logo from './logo.svg';
import DWTLogo from './icon-dwt.svg';
import DynamsoftLogo from './logo-dynamsoft-white-159X39.svg';
import './App.css';
import DWT from './DynamsoftSDK';

class App extends Component {
  productKey = 't0140cQMAAGnOvWTyoOR4HEFckJJmzMWpZcPSHyXGAvYGxgEkg5fBnRoFPslaAayuNOe5B/gp7plUCIUAtf6Ttb98d7Ifv/3A6Mxsu7CZLJhKHUuMorfuu/E/ZrOfuSyoMz7zjXKjgvHcMO1HiGbvyHv+GBWM54ZpP4Wej2RorGBUMJ4b4tx40yqnXlIiqvs=';
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={DWTLogo} className="dwt-logo" alt="Dynamic Web TWAIN Logo" />
          <div style={{ width: "10px" }}></div>
          <img src={logo} className="App-logo" alt="logo" />
          <div style={{ width: "770px" }}></div>
          <img src={DynamsoftLogo} className="ds-logo" alt="Dynamsoft Logo" />
        </header>
        <br />
        <DWT
          productKey={this.productKey}
          features={0b1111111}/** 0b1: scan, 0b10: camera, 0b100: load, 0b1000: save, 0b10000: upload, 0b100000:baroce, 0b1000000: ocr */
        />
      </div>
    );
  }
}

export default App;

import React from 'react';
import './DWTController.css';

export default class DWTController extends React.Component {
    constructor(props) {
        super(props);
        if (this.props.features & 7 === 0) {
            //no input tab
            this.initialShownTabs = this.props.features;
        } else {
            //120: hide all inputs 127&~7
            this.initialShownTabs = this.props.features & 1 || this.props.features & 2 || this.props.features & 4;
            if (this.props.features & 24) {
                this.initialShownTabs += 8;
            } else if (this.props.features & 96) {
                this.initialShownTabs += 16;
            }
        }
        this.state = {
            shownTabs: this.initialShownTabs,
            scanners: [],
            deviceSetup: {
                currentScanner: "Looking for devices..",
                currentCamera: "Looking for devices..",
                bShowUI: false,
                bADF: false,
                bDuplex: false,
                nPixelType: "0",
                nResolution: "100",
                isVideoOn: false
            },
            cameras: [],
            cameraSettings: [],
            saveFileName: (new Date()).getTime().toString(),
            saveFileFormat: "jpg",
            bUseFileUploader: false,
            bMulti: false,
            readingBarcode: false,
            ocring: false
        };
    }
    initialShownTabs = 127;
    fileUploaderReady = false;
    Dynamsoft = this.props.Dynamsoft;
    DWObject = null;
    dbrObject = null;
    fileUploaderManager = null;
    dbrResults = [];
    handleTabs(event) {
        if (event.keyCode && event.keyCode !== 32) return;
        event.target.blur();
        let nControlIndex = parseInt(event.target.getAttribute("controlindex"));
        (nControlIndex & 5) && this.toggleCameraVideo(false);
        if (this.state.shownTabs & nControlIndex) { //close a Tab
            this.setState({ shownTabs: this.state.shownTabs - nControlIndex });
        } else { //Open a tab
            let _tabToShown = this.state.shownTabs;
            if (nControlIndex & 7) _tabToShown &= ~7;
            if (nControlIndex & 24) _tabToShown &= ~24;
            this.setState({ shownTabs: _tabToShown + nControlIndex });
        }
    }
    componentDidUpdate(prevProps) {
        if (this.props.dwt !== prevProps.dwt) {
            this.DWObject = this.props.dwt;
            if (this.DWObject) {
                if (this.props.features & 0b1) {
                    let vCount = this.DWObject.SourceCount;
                    let sourceNames = [];
                    for (let i = 0; i < vCount; i++)
                        sourceNames.push(this.DWObject.GetSourceNameItems(i));
                    this.setState({ scanners: sourceNames });
                    if (sourceNames.length > 0)
                        this.onSourceChange(sourceNames[0]);
                }
                if (this.props.features & 0b10) {
                    let cameraNames = this.DWObject.Addon.Webcam.GetSourceList();
                    this.setState({ cameras: cameraNames });
                    if (cameraNames.length > 0)
                        this.onCameraChange(cameraNames[0]);
                }
                if (this.props.features & 0b100000) {
                    this.initBarcodeReader(this.props.features);
                }
                if (this.props.features & 0b1000000) {
                    this.initOCR(this.props.features);
                }
                if (this.props.features & 0b10000000) {
                    this.Dynamsoft.FileUploader.Init("", (objFileUploader) => {
                        this.fileUploaderManager = objFileUploader;
                        if (!this.fileUploaderReady) {
                            this.fileUploaderReady = true;
                            this.props.handleStatusChange(128);
                        }
                    }, (errorCode, errorString) => {
                        this.handleException({ code: errorCode, message: errorString });
                        if (!this.fileUploaderReady) {
                            this.fileUploaderReady = true;
                            this.props.handleStatusChange(128);
                        }
                    });
                }
            }
        }
    }
    // Tab 1: Scanner
    onSourceChange(value) {
        let oldDeviceSetup = this.state.deviceSetup;
        oldDeviceSetup.currentScanner = value;
        this.setState({
            deviceSetup: oldDeviceSetup
        });
        if (value === "noscanner") return;
        if (this.Dynamsoft.Lib.env.bMac) {
            if (value.indexOf("ICA") === 0) {
                let oldDeviceSetup = this.state.deviceSetup;
                oldDeviceSetup.noUI = true;
                this.setState({
                    deviceSetup: oldDeviceSetup
                });
            } else {
                let oldDeviceSetup = this.state.deviceSetup;
                oldDeviceSetup.noUI = false;
                this.setState({
                    deviceSetup: oldDeviceSetup
                });
            }
        }
    }
    handleScannerSetupChange(e, option) {
        switch (option.substr(0, 1)) {
            default: break;
            case "b":
                this.onScannerSetupChange(option, e.target.checked);
                break;
            case "n":
                this.onScannerSetupChange(option, e.target.value);
                break;
        }
    }
    onScannerSetupChange(option, value) {
        let oldDeviceSetup = this.state.deviceSetup;
        switch (option) {
            case "bShowUI":
                oldDeviceSetup.bShowUI = value;
                break;
            case "bADF":
                oldDeviceSetup.bADF = value;
                break;
            case "bDuplex":
                oldDeviceSetup.bDuplex = value;
                break;
            case "nPixelType":
                oldDeviceSetup.nPixelType = value;
                break;
            case "nResolution":
                oldDeviceSetup.nResolution = value;
                break;
            default: break;
        }
        this.setState({
            deviceSetup: oldDeviceSetup
        });
    }
    acquireImage() {
        this.DWObject.CloseSource();
        for (let i = 0; i < this.DWObject.SourceCount; i++) {
            if (this.DWObject.GetSourceNameItems(i) === this.state.deviceSetup.currentScanner) {
                this.DWObject.SelectSourceByIndex(i);
                break;
            }
        }
        this.DWObject.OpenSource();
        this.DWObject.AcquireImage(
            {
                IfShowUI: this.state.deviceSetup.bShowUI,
                PixelType: this.state.deviceSetup.nPixelType,
                Resolution: this.state.deviceSetup.nResolution,
                IfFeederEnabled: this.state.deviceSetup.bADF,
                IfDuplexEnabled: this.state.deviceSetup.bDuplex,
                IfDisableSourceAfterAcquire: true,
                IfGetImageInfo: true,
                IfGetExtImageInfo: true,
                extendedImageInfoQueryLevel: 0
                /**
                 * NOTE: No errors are being logged!!
                 */
            },
            () => this.props.handleOutPutMessage("Acquire success!", "important"),
            () => this.props.handleOutPutMessage("Acquire failure!", "error")
        );
    }
    
    
    
        // Tab 3: Load
    loadImagesOrPDFs() {
        this.DWObject.IfShowFileDialog = true;
        this.DWObject.Addon.PDF.SetResolution(200);
        this.DWObject.Addon.PDF.SetConvertMode(1/*this.Dynamsoft.DWT.EnumDWT_ConvertMode.CM_RENDERALL*/);
        this.DWObject.LoadImageEx("", 5 /*this.Dynamsoft.DWT.EnumDWT_ImageType.IT_ALL*/, () => {
            this.props.handleOutPutMessage("Loaded an image successfully.");
        }, (errorCode, errorString) => this.props.handleException({ code: errorCode, message: errorString }));
    }
    // Tab 4: Save & Upload
    handleFileNameChange(event) {
        this.setState({ saveFileName: event.target.value });
    }
    handleSaveConfigChange(event) {
        let format = event.target.value;
        switch (format) {
            default: break;
            case "multiPage":
                this.setState({ bMulti: event.target.checked }); break;
            case "tif":
            case "pdf":
                this.setState({ saveFileFormat: event.target.value, bMulti: true }); break;
            case "bmp":
            case "jpg": break;
        }
    }
    toggleUseUploade(event) {
        this.setState({ bUseFileUploader: event.target.checked });
    }
    saveOrUploadImage(_type) {
        if (_type !== "local" && _type !== "server") return;
        let fileName = this.state.saveFileName + "." + this.state.saveFileFormat;
        let imagesToUpload = [];
        let fileType = 0;
        let onSuccess = () => {
            this.setState({
                saveFileName: (new Date()).getTime().toString()
            });
            _type === "local" ? this.props.handleOutPutMessage(fileName + " saved successfully!", "important") : this.props.handleOutPutMessage(fileName + " uploaded successfully!", "important");
        };
        let onFailure = (errorCode, errorString, httpResponse) => {
            (httpResponse && httpResponse !== "") ? this.props.handleOutPutMessage(httpResponse, "httpResponse") : this.props.handleException({ code: errorCode, message: errorString });
        };
        if (this.state.bMulti) {
            if (this.props.selected.length === 1 || this.props.selected.length === this.props.buffer.count) {
                if (_type === "local") {
                    switch (this.state.saveFileFormat) {
                        default: break;
                        case "tif": this.DWObject.SaveAllAsMultiPageTIFF(fileName, onSuccess, onFailure); break;
                        case "pdf": this.DWObject.SaveAllAsPDF(fileName, onSuccess, onFailure); break;
                    }
                }
                else {
                    for (let i = 0; i < this.props.buffer.count; i++)
                        imagesToUpload.push(i);
                }
            } else {
                if (_type === "local") {
                    switch (this.state.saveFileFormat) {
                        default: break;
                        case "tif": this.DWObject.SaveSelectedImagesAsMultiPageTIFF(fileName, onSuccess, onFailure); break;
                        case "pdf": this.DWObject.SaveSelectedImagesAsMultiPagePDF(fileName, onSuccess, onFailure); break;
                    }
                }
                else {
                    imagesToUpload = this.props.selected;
                }
            }
        } else {
            if (_type === "local") {
                switch (this.state.saveFileFormat) {
                    default: break;
                    case "bmp": this.DWObject.SaveAsBMP(fileName, this.props.buffer.current, onSuccess, onFailure); break;
                    case "jpg": this.DWObject.SaveAsJPEG(fileName, this.props.buffer.current, onSuccess, onFailure); break;
                    case "tif": this.DWObject.SaveAsTIFF(fileName, this.props.buffer.current, onSuccess, onFailure); break;
                    case "png": this.DWObject.SaveAsPNG(fileName, this.props.buffer.current, onSuccess, onFailure); break;
                    case "pdf": this.DWObject.SaveAsPDF(fileName, this.props.buffer.current, onSuccess, onFailure); break;
                }
            }
            else {
                imagesToUpload.push(this.props.buffer.current);
            }
        }
        for (let o in this.Dynamsoft.DWT.EnumDWT_ImageType) {
            if (o.toLowerCase().indexOf(this.state.saveFileFormat) !== -1 && this.Dynamsoft.DWT.EnumDWT_ImageType[o] < 7) {
                fileType = this.Dynamsoft.DWT.EnumDWT_ImageType[o];
                break;
            }
        }
        if (_type === "server") {
            let protocol = this.Dynamsoft.Lib.detect.ssl ? "https://" : "http://"
            let _strPort = 2020;//for testing
            /*window.location.port === "" ? 80 : window.location.port;
            if (this.Dynamsoft.Lib.detect.ssl === true)
                _strPort = window.location.port === "" ? 443 : window.location.port;*/

            let strActionPage = "/upload";
            let serverUrl = protocol + window.location.hostname + ":" + _strPort + strActionPage;
            if (this.state.bUseFileUploader) {
                var job = this.fileUploaderManager.CreateJob();
                job.ServerUrl = serverUrl;
                job.FileName = fileName;
                job.ImageType = fileType;
                this.DWObject.GenerateURLForUploadData(imagesToUpload, fileType, (resultURL, newIndices, enumImageType) => {
                    job.SourceValue.Add(resultURL, fileName);
                    job.OnUploadTransferPercentage = (job, sPercentage) => {
                        this.props.handleOutPutMessage("Uploading...(" + sPercentage + "%)");
                    };
                    job.OnRunSuccess = (job) => { onSuccess() };
                    job.OnRunFailure = (job, errorCode, errorString) => onFailure(errorCode, errorString);
                    this.fileUploaderManager.Run(job);
                }, (errorCode, errorString, strHTTPPostResponseString, newIndices, enumImageType) => {
                    this.handleException({ code: errorCode, message: errorString });
                });
            } else
                this.DWObject.HTTPUpload(serverUrl, imagesToUpload, fileType, this.Dynamsoft.DWT.EnumDWT_UploadDataFormat.Binary, fileName, onSuccess, onFailure);
        }
    }
    
    render() {
        return (
            <div className="DWTController">
                <div className="divinput">
                    <ul className="PCollapse">
                        {this.props.features & 0b1 ? (
                            <li>
                                <div className="divType" tabIndex="1" controlindex="1" onKeyUp={(event) => this.handleTabs(event)} onClick={(event) => this.handleTabs(event)}>
                                    <div className={this.state.shownTabs & 1 ? "mark_arrow expanded" : "mark_arrow collapsed"} ></div>
                                    Custom Scan</div>
                                <div className="divTableStyle" style={this.state.shownTabs & 1 ? { display: "block" } : { display: "none" }}>
                                    <ul>
                                        <li>
                                            <select tabIndex="1" value={this.state.deviceSetup.currentScanner} className="fullWidth" onChange={(e) => this.onSourceChange(e.target.value)}>
                                                {
                                                    this.state.scanners.length > 0 ?
                                                        this.state.scanners.map((_name, _index) =>
                                                            <option value={_name} key={_index}>{_name}</option>
                                                        )
                                                        :
                                                        <option value="noscanner">Looking for devices..</option>
                                                }
                                            </select>
                                        </li>
                                        <li>
                                            <ul>
                                                <li>
                                                    {
                                                        this.state.deviceSetup.noUI ? "" : (
                                                            <label style={{ width: "32%", marginRight: "2%" }} ><input tabIndex="1" type="checkbox"
                                                                checked={this.state.deviceSetup.bShowUI}
                                                                onChange={(e) => this.handleScannerSetupChange(e, "bShowUI")}
                                                            />Show UI&nbsp;</label>
                                                        )
                                                    }
                                                    <label style={{ width: "32%", marginRight: "2%" }} ><input tabIndex="1" type="checkbox"
                                                        checked={this.state.deviceSetup.bADF}
                                                        onChange={(e) => this.handleScannerSetupChange(e, "bADF")}
                                                    />Page Feeder&nbsp;</label>
                                                    <label style={{ width: "32%" }}><input tabIndex="1" type="checkbox"
                                                        checked={this.state.deviceSetup.bDuplex}
                                                        onChange={(e) => this.handleScannerSetupChange(e, "bDuplex")}
                                                    />Duplex</label>
                                                </li>
                                                <li>
                                                    <select tabIndex="1" style={{ width: "48%", marginRight: "4%" }}
                                                        value={this.state.deviceSetup.nPixelType}
                                                        onChange={(e) => this.handleScannerSetupChange(e, "nPixelType")}>
                                                        <option value="0">B&amp;W</option>
                                                        <option value="1">Gray</option>
                                                        <option value="2">Color</option>
                                                    </select>
                                                    <select tabIndex="1" style={{ width: "48%" }}
                                                        value={this.state.deviceSetup.nResolution}
                                                        onChange={(e) => this.handleScannerSetupChange(e, "nResolution")}>
                                                        <option value="100">100 DPI</option>
                                                        <option value="200">200 DPI</option>
                                                        <option value="300">300 DPI</option>
                                                        <option value="600">600 DPI</option>
                                                    </select>
                                                </li>
                                            </ul>
                                        </li>
                                        <li className="tc">
                                            <button tabIndex="1"  onClick={() => this.acquireImage()} >Scan</button>
                                        </li>
                                    </ul>
                                </div>
                            </li>
                        ) : ""}
                        {this.props.features & 0b10 ? (
                            <li>
                                <div className="divType" tabIndex="2" controlindex="2" onClick={(event) => this.handleTabs(event)} onKeyUp={(event) => this.handleTabs(event)}>
                                    <div className={this.state.shownTabs & 2 ? "mark_arrow expanded" : "mark_arrow collapsed"} ></div>
                                    Use Webcams</div>
                                <div className="divTableStyle" style={this.state.shownTabs & 2 ? { display: "block" } : { display: "none" }}>
                                    <ul>
                                        <li>
                                            <select tabIndex="2" value={this.state.deviceSetup.currentCamera} className="fullWidth" onChange={(e) => this.onCameraChange(e.target.value)}>
                                                {
                                                    this.state.cameras.length > 0 ?
                                                        this.state.cameras.map((_name, _index) =>
                                                            <option value={_index} key={_index}>{_name}</option>
                                                        )
                                                        :
                                                        <option value="nocamera">Looking for devices..</option>
                                                }
                                            </select>
                                           
                                           
                                           
                                        </li>
                                        <li className="tc">
                                            <button tabIndex="2" className="majorButton enabled width_48p" onClick={() => this.toggleShowVideo()}>{this.state.deviceSetup.isVideoOn ? "Hide Video" : "Show Video"}</button>
                                            <button tabIndex="2" className={this.state.deviceSetup.isVideoOn ? "majorButton enabled width_48p marginL_2p" : "majorButton disabled width_48p marginL_2p"} onClick={() => this.captureImage()} disabled={this.state.deviceSetup.isVideoOn ? "" : "disabled"} > Capture</button>
                                        </li>
                                    </ul>
                                </div>
                            </li>
                        ) : ""}
                        {this.props.features & 0b100 ? (
                            <li>
                                <div className="divType" tabIndex="3" controlindex="4" onClick={(event) => this.handleTabs(event)} onKeyUp={(event) => this.handleTabs(event)}>
                                    <div className={this.state.shownTabs & 4 ? "mark_arrow expanded" : "mark_arrow collapsed"} ></div>
                                    Load Images or PDFs</div>
                                <div className="divTableStyle" style={this.state.shownTabs & 4 ? { display: "block" } : { display: "none" }}>
                                    <ul>
                                        <li className="tc">
                                            <button tabIndex="3" className="majorButton enabled" onClick={() => this.loadImagesOrPDFs()} style={{ width: "100%" }}>Load</button>
                                        </li>
                                    </ul>
                                </div>
                            </li>
                        ) : ""}
                        {(this.props.features & 0b1000) || (this.props.features & 0b10000) ? (
                            <li>
                                <div className="divType" tabIndex="4" controlindex="8" onClick={(event) => this.handleTabs(event)} onKeyUp={(event) => this.handleTabs(event)}>
                                    <div className={this.state.shownTabs & 8 ? "mark_arrow expanded" : "mark_arrow collapsed"} ></div>
                                    Save Documents</div>
                                <div className="divTableStyle div_SaveImages" style={this.state.shownTabs & 8 ? { display: "block" } : { display: "none" }}>
                                    <ul>
                                        <li>
                                            <label className="fullWidth"><span style={{ width: "25%" }}>File Name:</span>
                                                <input tabIndex="4" style={{ width: "73%", marginLeft: "2%" }} type="text" size="20" value={this.state.saveFileName} onChange={(e) => this.handleFileNameChange(e)} /></label>
                                        </li>
                                        <li>
                                            <label><input tabIndex="4" type="radio" value="bmp" name="ImageType" onClick={(e) => this.handleSaveConfigChange(e)} />BMP</label>
                                            <label><input tabIndex="4" type="radio" value="jpg" name="ImageType" defaultChecked onClick={(e) => this.handleSaveConfigChange(e)} />JPEG</label>
                                            <label><input tabIndex="4" type="radio" value="tif" name="ImageType" onClick={(e) => this.handleSaveConfigChange(e)} />TIFF</label>
                                            <label><input tabIndex="4" type="radio" value="png" name="ImageType" onClick={(e) => this.handleSaveConfigChange(e)} />PNG</label>
                                            <label><input tabIndex="4" type="radio" value="pdf" name="ImageType" onClick={(e) => this.handleSaveConfigChange(e)} />PDF</label>
                                        </li>
                                        <li>
                                            <label><input tabIndex="4" type="checkbox"
                                                checked={(this.state.saveFileFormat === "pdf" || this.state.saveFileFormat === "tif") && (this.state.bMulti ? "checked" : "")}
                                                value="multiPage" disabled={(this.state.saveFileFormat === "pdf" || this.state.saveFileFormat === "tif") ? "" : "disabled"} onChange={(e) => this.handleSaveConfigChange(e)} />Upload Multiple Pages</label>
                                            {((this.props.features & 0b10000) && (this.props.features & 0b10000000))
                                                ? <label>
                                                    <input tabIndex="4" title="Use Uploader" type="checkbox" onChange={(e) => this.toggleUseUploade(e)} />Use File Uploader</label>
                                                : ""}
                                        </li>
                                        <li className="tc">
                                            {(this.props.features & 0b1000) ? <button tabIndex="4" className={this.props.buffer.count === 0 ? "majorButton disabled width_48p" : "majorButton enabled width_48p"} disabled={this.props.buffer.count === 0 ? "disabled" : ""} onClick={() => this.saveOrUploadImage('local')} >Save to Local</button> : ""}
                                            {(this.props.features & 0b10000) ? <button tabIndex="4" className={this.props.buffer.count === 0 ? "majorButton disabled width_48p marginL_2p" : "majorButton enabled width_4p marginL_2p"} disabled={this.props.buffer.count === 0 ? "disabled" : ""} onClick={() => this.saveOrUploadImage('server')} >Upload to Server</button> : ""}
                                        </li>
                                    </ul>
                                </div>
                            </li>
                        ) : ""}
                        {(this.props.features & 0b100000) || (this.props.features & 0b1000000) ? (
                            <li>
                                <div className="divType" tabIndex="5" controlindex="16" onClick={(event) => this.handleTabs(event)} onKeyUp={(event) => this.handleTabs(event)}>
                                    <div className={this.state.shownTabs & 16 ? "mark_arrow expanded" : "mark_arrow collapsed"} ></div>
                                    Recognize</div>
                                <div className="divTableStyle" style={this.state.shownTabs & 16 ? { display: "block" } : { display: "none" }}>
                                    <ul>
                                        <li className="tc">
                                            {(this.props.features & 0b100000) ? <button tabIndex="5" className={this.props.buffer.count === 0 ? "majorButton disabled width_48p" : "majorButton enabled width_48p"} disabled={this.props.buffer.count === 0 || this.state.readingBarcode ? "disabled" : ""} onClick={() => this.readBarcode()} >{this.state.readingBarcode ? "Reading..." : "Read Barcode"}</button> : ""}
                                            {(this.props.features & 0b1000000) ? <button tabIndex="5" className={this.props.buffer.count === 0 ? "majorButton disabled width_48p marginL_2p" : "majorButton enabled width_48p marginL_2p"} disabled={this.props.buffer.count === 0 || this.state.ocring ? "disabled" : ""} onClick={() => this.ocr()}>{this.state.ocring ? "Ocring..." : "OCR (English)"}</button> : ""}
                                        </li>
                                        {this.props.barcodeRects.length > 0 &&
                                            (<li><button tabIndex="5" className="majorButton enabled fullWidth" onClick={() => this.props.handleBarcodeResults("clear")}>Clear Barcode Rects</button></li>)
                                        }
                                    </ul>
                                </div>
                            </li>
                        ) : ""}
                    </ul>
                </div>
               
            </div >
        );
    }
}
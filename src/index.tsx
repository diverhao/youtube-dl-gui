import styled from "styled-components";
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
const { spawn } = require("child_process");
import path from "path";
import { clipboard } from "electron";
// import { StyledRemoveButton } from "./StyledComponents.js";

// ------------------------------

let root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const downloadQueue: Download[] = [];

const youtube_dl_path = "/Users/1h7/Desktop/youtubeTmp";
const youtube_dl_binary = "/opt/homebrew/bin/youtube-dl";

const StyledRemoveButton = styled.div<any>`
	display: flex;
	justify-content: center;
	align-items: center;
	height: 20px;
	width: fit-content;
	padding: 8px;
	background-color: rgba(0, 100, 180, 0.5);
	border-radius: 4px;
	margin-top: 3px;
	margin-bottom: 3px;
	margin-right: 6px;

	&:hover {
		background-color: rgba(255, 0, 0, 0.5);
		cursor: pointer;
	}

	/* position: relative;
display: inline-block; */
`;

const StyledDownloadEntry = styled.div<any>`
	display: flex;
	flex-direction: "row";
	width: 100%;
	justify-content: flex-start;
	margin-top: 5px;
	margin-bottom: 5px;
	background-color: rgba(255, 255, 255, 0);
	border-radius: 4px;

	&:hover {
		background-color: rgba(100, 100, 100, 0.1);
	}

	/* position: relative;
display: inline-block; */
`;

// const statusBackgroundColors = ["AliceBlue", "DarSeaGreen", "DarkTurquoise", "DeepPink", "DeepSkyBlue", "Green", "GreenYellow", "Indigo"];
const statusBackgroundColors = [
	"rgba(219, 112,147, 0.5)",
	"rgba(205, 133, 63, 0.5)",
	"rgba(64, 224,208, 0.5)",
	"rgba(154, 205, 50, 0.5)",
	"rgba(112,128,144,0.5)",
	"rgba(255, 165, 0, 0.5)",
	"rgba(128,128,0, 0.5)",
	"rgba(255, 0, 255, 0.5)",
	"rgba(50, 205, 50, 0.5)",
];

class Download {
	readonly link: string;
	readonly type: "audio" | "video";
	forceUpdateParent: any;
	status: "Paused" | "Finished" | "Duplicated" | "Not Started" | "Error" | "Downloading" = "Not Started";
	ls: any = undefined;
	destination: string = "";
	backgroundColor: string = statusBackgroundColors[Math.floor(Math.random() * statusBackgroundColors.length)];

	constructor(link: string, type: "audio" | "video", forceUpdateParent: any, newName: string = "") {
		this.link = link;
		this.type = type;
		this.forceUpdateParent = forceUpdateParent;

		if (newName === "") {
			this.destination = "";
		} else {
			let destinationTmp = newName;
			//todo: add other types
			if (newName.substring(newName.length - 4) !== ".mp3") {
				destinationTmp = `${newName}.mp3`;
			}
			if (path.isAbsolute(destinationTmp)) {
				this.destination = destinationTmp;
			} else {
				this.destination = `${youtube_dl_path}/${destinationTmp}`;
			}
		}
	}

	Status = (props: any) => {
		const [destination, setDestination] = useState<string>(this.destination);
		const [output, setOutput] = useState<string>(this.status);
		useEffect(() => {
			props.ls?.stdout.on("data", (data: any) => {
				console.log(`stdout: ${data}`);
				if (`${data}`.includes("[download] Destination")) {
					const data1 = `${data}`.replace("[download] Destination :", "");
					const data2 = data1.split("[download]")[1];
					const home = process.env.HOME;
					const data3 = data2.replace(`${home}/Desktop/youtubeTmp/`, "");
					setDestination(data3);
				} else {
					setOutput(`${data}`);
				}
			});

			props.ls?.stderr.on("data", (data: any) => {
				this.stop();
				console.log(`stderr: ${data}`);
				this.status = "Error";
				setOutput(`${data}`);
			});

			props.ls?.on("error", (error: any) => {
				console.log(`error: ${error.message}`);
				// setOutput(`error: ${error.message}`);
			});

			props.ls?.on("close", (code: any) => {
				// finished normally (code = 0) or killed (code = null)
				console.log(`child process exited with code ${code}`);
				if (this.status !== "Error") {
					if (this.status !== "Paused") {
						this.status = "Finished";
					}
					setOutput(this.status);
				}
			});
		}, [props.ls]);

		return (
			<StyledDownloadEntry>
				<div
					style={{
						width: "80%",
						backgroundColor: this.backgroundColor,
						borderRadius: "7px",
						padding: "10px",
					}}
				>
					<p>{destination}</p>
					<p>{output}</p>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						width: "15%",
						justifyContent: "flex-start",
						padding: "15px",
					}}
				>
					<StyledRemoveButton onClick={() => this.remove()}>Remove</StyledRemoveButton>
					{this.status === "Paused" ? (
						<StyledRemoveButton onClick={() => this.resume()}>Resume</StyledRemoveButton>
					) : this.status === "Finished" || this.status === "Error" ? null : (
						<StyledRemoveButton onClick={() => this.stop()}>Pause</StyledRemoveButton>
					)}
				</div>
			</StyledDownloadEntry>
		);
	};

	start = () => {
		this.status = "Downloading";
		const lsOptions: string[] = [];
		if (this.type === "audio") {
			lsOptions.push("-x");
			lsOptions.push("--audio-format");
			lsOptions.push("mp3");
			if (this.destination !== "") {
				lsOptions.push("-o");
				lsOptions.push(this.destination);
			}
		}
		lsOptions.push(this.link);
		this.ls = spawn(youtube_dl_binary, lsOptions);
		//todo: check duplicated download
	};

	stop = () => {
		this.status = "Paused";
		this.ls?.kill();
		this.ls = undefined;
	};

	remove = (changeQueue: boolean = true) => {
		// stop first
		this.stop();
		// then remove
		if (changeQueue) {
			let index = downloadQueue.indexOf(this);
			if (index !== -1) {
				downloadQueue.splice(index, 1);
			}
		}
		this.forceUpdateParent();
	};

	resume = () => {
		this.start();
		this.forceUpdateParent();
		// this.setRandom(Math.random());
	};
	readonly componentKey: string = Math.random().toString();

	getStatusComponent = () => {
		return <this.Status ls={this.ls} key={this.componentKey} />;
	};
}

const App = () => {
	// invoked upon clicking the "Download" button
	// create a Donwload object
	// add it to the downloadQueue
	// start the download
	const createDownload = (link: string, type: "audio" | "video", forceUpdate: any, newName: string = "") => {
		return new Download(link, type, forceUpdate, newName);
	};

	const [linkValue, setLinkValue] = useState<string>("");
	const [newName, setNewName] = useState<string>("");
	const [type, setType] = useState<"audio" | "video">("audio");
	const handleChangeType = (event: any) => {
		setType(event?.target.value);
	};

	const [, updateState] = React.useState({});
	const forceUpdate = React.useCallback(() => updateState({}), []);

	const handleClick = () => {
		const download = createDownload(linkValue, type, forceUpdate, newName);
		download.start();
		downloadQueue.push(download);
		forceUpdate();
	};
	const handleInputChange = (event: any) => {
		setLinkValue(event.target.value);
	};
	const handleNewNameChange = (event: any) => {
		setNewName(event.target.value);
	};
	const handleTerminate = () => {
		for (let ii = 0; ii < downloadQueue.length; ii++) {
			const download = downloadQueue[ii];
			download.ls.kill();
		}
	};
	const handleStopAll = () => {
		for (let ii = 0; ii < downloadQueue.length; ii++) {
			const download = downloadQueue[ii];
			download.stop();
		}
	};
	const handleRemoveAll = () => {
		downloadQueue.forEach((download: Download) => {
			console.log("removing", download.link, download.destination);
			download.remove(false);
		});
		// empty the queue
		downloadQueue.length = 0;
	};

	const removeFinishedAndErrored = () => {
		let indices: number[] = [];

		for (let ii = 0; ii < downloadQueue.length; ii++) {
			const download = downloadQueue[ii];
			if (download.status === "Finished" || download.status === "Error") {
				console.log("removing", download.link, download.destination);
				download.remove(false);
				// add to head
				indices.unshift(ii);
			}
		}
		indices.forEach((index: number) => {
			downloadQueue.splice(index, 1);
		});
	};

	const pasteLink = () => {
		const link = clipboard.readText();
		setLinkValue(link);
	};

	const clearLink = () => {
		setLinkValue("");
	};

	const pasteNewName = () => {
		const newName = clipboard.readText();
		setNewName(newName);
	};

	const clearNewName = () => {
		setNewName("");
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "90%",
				left: "5%",
				position: "absolute",
				fontFamily: "sans-serif",
				fontSize: "20px",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
				}}
			>
				<h1>Download YouTube</h1> <img src="../src/assets/logo.png" height="45px" />
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "row",
					width: "100%",
					alignItems: "center",
				}}
			>
				Link:
				<input
					type="text"
					value={linkValue}
					onChange={handleInputChange}
					placeholder="Paste YouTube link here"
					style={{
						width: "100%",
						fontSize: "20px",
						margin: "5px",
					}}
				/>
				<StyledRemoveButton onClick={clearLink}>Clear</StyledRemoveButton>
				<StyledRemoveButton onClick={pasteLink}>Paste</StyledRemoveButton>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					width: "100%",
					alignItems: "center",
				}}
			>
				Name:
				<input
					type="text"
					value={newName}
					onChange={handleNewNameChange}
					placeholder="Optional new name"
					style={{
						width: "100%",
						fontSize: "20px",
						margin: "5px",
					}}
				/>
				<StyledRemoveButton onClick={clearNewName}>Clear</StyledRemoveButton>
				<StyledRemoveButton onClick={pasteNewName}>Paste</StyledRemoveButton>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "row",
					width: "100%",
					alignItems: "center",
				}}
			>
				Download type:
				<select
					name="type"
					id="type"
					value={type}
					onChange={handleChangeType}
					style={{
						width: "130px",
						fontSize: "20px",
						margin: "5px",
					}}
				>
					<option value="audio">audio</option>
					<option value="video">video</option>
				</select>
			</div>

			<br></br>
			<div
				style={{
					display: "flex",
					flexFlow: "row",
					justifyContent: "flex-start",
					width: "100%",
					height: "25px",
				}}
			>
				<StyledRemoveButton
					onClick={handleClick}
					style={{
						height: "100%",
					}}
				>
					Click to Download
				</StyledRemoveButton>
				<StyledRemoveButton
					onClick={handleStopAll}
					style={{
						height: "100%",
					}}
				>
					Pause All
				</StyledRemoveButton>
				<StyledRemoveButton
					onClick={handleRemoveAll}
					style={{
						height: "100%",
					}}
				>
					Remove All
				</StyledRemoveButton>
				<StyledRemoveButton
					onClick={removeFinishedAndErrored}
					style={{
						height: "100%",
					}}
				>
					Remove Finished
				</StyledRemoveButton>

				{/* <button type="button" onClick={handleStopAll}>
					Pause All
				</button>
				<button type="button" onClick={handleRemoveAll}>
					Remove All
				</button>
				<button type="button" onClick={removeFinishedAndErrored}>
					Remove Finished or Errored
				</button> */}
			</div>
			<p></p>
			{downloadQueue.map((download: Download) => {
				return download.getStatusComponent();
			})}
		</div>
	);
};

root.render(<App />);

import styled from "styled-components";
import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { spawn, exec, execSync } from "child_process";
import path from "path";
import { shell, clipboard, ipcRenderer } from "electron";
import fs from "fs";

// import { StyledRemoveButton } from "./StyledComponents.js";

// ------------------------------

let root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const AppErrorPage = () => {
	useEffect(() => {
		// process.exit();
	}, []);
	return (
		<div
			style={{
				fontFamily: "sans-serif",
				margin: "30px",
				fontSize: "15px",
				userSelect: "none",
			}}
		>
			Error: cannot find <span style={{ fontFamily: "monospace" }}> youtube-dl</span> command in following locations:
			<ul>
				{youtube_dl_binaries.map((binary: string) => {
					return (
						<li
							style={{
								margin: "10px 0px",
								fontFamily: "monospace",
							}}
						>
							{binary}
						</li>
					);
				})}
			</ul>
			Please install the <span style={{ fontFamily: "monospace" }}> youtube-dl</span> to one of above locations.
		</div>
	);
};

const downloadQueue: Download[] = [];

//todo: dynamic variable
const youtube_dl_path = `${process.env.HOME}/Desktop/youtubeTmp`;
let youtube_dl_binary = "";
const youtube_dl_binaries = ["/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp", "/usr/bin/yt-dlp"];
for (const binary of youtube_dl_binaries) {
	if (fs.existsSync(binary)) {
		youtube_dl_binary = binary;
		console.log(`Found youtube-dl at ${binary}`);
		break;
	}
}

window.resizeTo(600, 800);
let downloadColorIndex = 0;

// ---------------------------------------------------------

const StyledRemoveButtonRed = styled.div<any>`
	display: flex;
	justify-content: center;
	align-items: center;
	height: 13px;
	width: fit-content;
	padding: 5px;
	background-color: rgba(255, 0, 0, 0.3);
	border-radius: 3px;
	margin-top: 2px;
	margin-bottom: 2px;
	margin-right: 4px;
	user-select: none;
	transition: background-color 200ms;

	&:hover {
		background-color: rgba(255, 0, 0, 0.5);
		cursor: pointer;
	}
`;
const StyledRemoveButton = styled.div<any>`
	display: flex;
	justify-content: center;
	align-items: center;
	height: 13px;
	width: fit-content;
	padding: 5px;
	background-color: rgba(0, 100, 180, 0.5);
	border-radius: 3px;
	margin-top: 2px;
	margin-bottom: 2px;
	margin-right: 4px;
	user-select: none;
	transition: background-color 200ms;

	&:hover {
		background-color: rgba(255, 0, 0, 0.5);
		cursor: pointer;
	}
`;

const StyledDownloadEntry = styled.div<any>`
	display: flex;
	flex-direction: "row";
	width: 100%;
	justify-content: flex-start;
	margin-top: 5px;
	margin-bottom: 5px;
	background-color: rgba(255, 255, 255, 0);
	border-radius: 3px;
	user-select: text;
	transition: background-color 200ms;

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
	backgroundColor: string = statusBackgroundColors[downloadColorIndex++ % statusBackgroundColors.length];

	constructor(link: string, type: "audio" | "video", forceUpdateParent: any, newName: string = "") {
		this.link = link;
		this.type = type;
		this.forceUpdateParent = forceUpdateParent;

		if (newName === "") {
			this.destination = "";
		} else {
			let destinationTmp = newName;
			//todo: add other types
			if (type === "audio" && newName.substring(newName.length - 4) !== ".mp3") {
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
					const data3 = data2.replace(`${youtube_dl_path}`, "");
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
						borderRadius: "3px",
						paddingLeft: "8px",
						paddingRight: "5px",
						display: "flex",
						flexDirection: "column",
					}}
				>
					<div
						style={{
							marginTop: "5px",
							marginBottom: "2px",
						}}
					>
						{destination}
					</div>
					<div
						style={{
							marginTop: "2px",
							marginBottom: "5px",
						}}
					>
						{output}
					</div>
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
			// do not use the file header time
			lsOptions.push("--no-mtime");
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
        const linkWoPlaylist = link.split("&list=")[0];
		return new Download(linkWoPlaylist, type, forceUpdate, newName);
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
			if (download.status === "Downloading") {
				download.stop();
			}
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
		// also clean new name
		setNewName("");
	};

	const clearLink = () => {
		setLinkValue("");
		// also clean new name
		setNewName("");
	};

	const pasteNewName = () => {
		const newName = clipboard.readText();
		setNewName(newName);
	};

	const clearNewName = () => {
		setNewName("");
	};

	const openFinder = () => {
		exec(`/usr/bin/open ${youtube_dl_path}`);
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "94%",
				left: "3%",
				position: "absolute",
				fontFamily: "sans-serif",
				fontSize: "13px",
				userSelect: "none",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					justifyContent: "space-between",
					width: "100%",
					alignItems: "center",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
					}}
				>
					<h1>Download YouTube</h1> <img src="./assets/logo.png" height="45px" />
				</div>
				<StyledRemoveButton onClick={openFinder}>Open download folder</StyledRemoveButton>
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
					style={{
						width: "100%",
						margin: "5px",
					}}
					value={linkValue}
					onChange={handleInputChange}
					placeholder="Paste YouTube link here"
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
						margin: "5px",
					}}
				>
					<option value="audio">audio</option>
					<option value="video">video</option>
				</select>
			</div>

			<div
				style={{
					display: "flex",
					flexFlow: "row",
					justifyContent: "flex-start",
					width: "100%",
					marginTop: "5px",
				}}
			>
				<StyledRemoveButton onClick={handleClick}>Click to Download</StyledRemoveButton>
				<StyledRemoveButton onClick={handleStopAll}>Pause All</StyledRemoveButton>
				<StyledRemoveButton onClick={handleRemoveAll}>Remove All</StyledRemoveButton>
				<StyledRemoveButton onClick={removeFinishedAndErrored}>Remove Finished</StyledRemoveButton>
			</div>
			{downloadQueue.map((download: Download) => {
				return download.getStatusComponent();
			})}
		</div>
	);
};

// ---------------------------------------------------------

if (youtube_dl_binary === "") {
	root.render(<AppErrorPage />);
} else {
	root.render(<App />);
}

ipcRenderer.on("close-window", () => {
	let popConfirm = false;
	// determine if there is any active task
	for (let ii = 0; ii < downloadQueue.length; ii++) {
		const download = downloadQueue[ii];
		if (download.status === "Downloading") {
			popConfirm = true;
			break;
		}
	}

	if (popConfirm) {
		root.render(
			<>
				<App />
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						position: "absolute",
						top: "0px",
						left: "0px",
						width: "100%",
						height: "100%",
						backgroundColor: "rgba(100,100,100,0.5)",
						backdropFilter: "blur(6px)",
						fontFamily: "sans-serif",
						fontSize: "20px",
						justifyContent: "center",
						alignItems: "center",
						color: "white",
                        userSelect: "none",
					}}
				>
					<p>Downloading in progress, are you sure to quit?</p>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "center",
							alignItems: "center",
						}}
					>
						<StyledRemoveButtonRed
							style={{
								height: "20px",
								padding: "10px",
                                margin: "10px",
							}}
							onClick={() => {
								// tell main process it is ok to close
								ipcRenderer.send("close-window-response");
							}}
						>
							Close
						</StyledRemoveButtonRed>
						<StyledRemoveButton
							style={{
								height: "20px",
								padding: "10px",
                                margin: "10px",
							}}
							onClick={() => {
								// no need to tell main process
								root.render(<App />);
							}}
						>
							Do not close
						</StyledRemoveButton>
					</div>
				</div>
			</>
		);
	} else {
		ipcRenderer.send("close-window-response");
	}
	// root.render(<AppErrorPage />);
});

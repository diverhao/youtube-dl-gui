import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
const { spawn } = require("child_process");

// ------------------------------

let root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const downloadQueue: any[] = [];

const App = () => {
	const download = (linkValue: string) => {
        const lsOptions: string[] = [];
        if (type === "audio")  {
            lsOptions.push("-x");
            lsOptions.push("--audio-format");
            lsOptions.push("mp3");
        }
		const ls = spawn(`/opt/homebrew/bin/youtube-dl`, [...lsOptions, linkValue]);
		downloadQueue.push(ls);
		ls.stdout.on("data", (data: any) => {
			console.log(`stdout: ${data}`);
			setOutput(`${data}`);
		});

		ls.stderr.on("data", (data: any) => {
			console.log(`stderr: ${data}`);
		});

		ls.on("error", (error: any) => {
			console.log(`error: ${error.message}`);
		});

		ls.on("close", (code: any) => {
			console.log(`child process exited with code ${code}`);
			setOutput("");
		});
	};

	const handleClick = () => {
		console.log("downloading", linkValue);
		download(linkValue);
	};
	const handleInputChange = (event: any) => {
		console.log(event.target.value);
		setLinkValue(event.target.value);
	};
	const [linkValue, setLinkValue] = useState<string>("");
	const [output, setOutput] = useState<string>("");
	const handleTerminate = () => {
		for (let ii = 0; ii < downloadQueue.length; ii++) {
			const job = downloadQueue[ii];
			job.kill();
		}
	};
	const [type, setType] = useState<"audio" | "video">("audio");
	const handleChangeType = (event: any) => {
		setType(event?.target.value);
	};
	return (
		<>
			<h1>Download YouTube</h1>
			<p>Link:</p>
			<input
				type="text"
				value={linkValue}
				onChange={handleInputChange}
				placeholder="paste youtube link here"
				style={{
					width: "80%",
				}}
			/>
			<br></br>
			<select name="type" id="type" value={type} onChange={handleChangeType}>
				<option value="audio">audio</option>
				<option value="video">video</option>
			</select>

			<br></br>
			<button type="button" onClick={handleClick}>
				Click to Download
			</button>
			<button type="button" onClick={handleTerminate}>
				Stop
			</button>
			<p>{output}</p>
		</>
	);
};

root.render(<App />);

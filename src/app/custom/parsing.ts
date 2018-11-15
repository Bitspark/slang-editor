export interface ParsedPortInformation {
	blueprint: string | undefined;
	instance: string;
	delegate: string | undefined;
	service: string | undefined;
	directionIn: boolean;
	port: string;
}

export class SlangParsing {
	public static parseReferenceString(portReference: string): ParsedPortInformation | undefined {
		if (portReference.length === 0) {
			return undefined;
		}

		const parsedInfo: ParsedPortInformation = {
			blueprint: undefined,
			instance: "",
			delegate: undefined,
			service: undefined,
			directionIn: false,
			port: ""
		};

		let separator = "";
		let operatorIdx = 0;
		let portIdx = 0;
		if (portReference.indexOf("(") !== -1) {
			parsedInfo.directionIn = true;
			separator = "(";
			operatorIdx = 1;
			portIdx = 0;
		} else if (portReference.indexOf(")") !== -1) {
			parsedInfo.directionIn = false;
			separator = ")";
			operatorIdx = 0;
			portIdx = 1;
		} else {
			return undefined;
		}

		const referenceSplit = portReference.split(separator);
		if (referenceSplit.length !== 2) {
			return undefined;
		}
		const instancePart = referenceSplit[operatorIdx];
		parsedInfo.port = referenceSplit[portIdx];

		if (instancePart === "") {
			parsedInfo.instance = "";
			parsedInfo.service = "main";
		} else {
			if (instancePart.indexOf(".") !== -1 && instancePart.indexOf("@") !== -1) {
				// Delegate and service must not both occur in string
				return undefined;
			}
			if (instancePart.indexOf(".") !== -1) {
				const instanceSplit = instancePart.split(".");
				if (instanceSplit.length === 2) {
					parsedInfo.instance = instanceSplit[0];
					parsedInfo.delegate = instanceSplit[1];
				}
			} else if (instancePart.indexOf("@") !== -1) {
				const instanceSplit = instancePart.split("@");
				if (instanceSplit.length === 2) {
					parsedInfo.instance = instanceSplit[1];
					parsedInfo.service = instanceSplit[0];
				}
			} else {
				parsedInfo.instance = instancePart;
				parsedInfo.service = "main";
			}
		}

		const splitInstance = parsedInfo.instance.split("#");
		if (splitInstance.length === 2) {
			parsedInfo.blueprint = splitInstance[0];
			parsedInfo.instance = splitInstance[1];
		}

		return parsedInfo;
	}
}
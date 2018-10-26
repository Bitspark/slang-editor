import {dia, shapes} from "jointjs";
import {OperatorModel} from "./model/operator";
import {BlueprintModel, BlueprintOrOperator} from "./model/blueprint";
import Port = dia.Element.Port;
import {PortModel, PortType} from "./model/port";

export class JointJSElements {
    private static createPortItems(group: string, port: PortModel): Array<Port> {
        let portItems: Array<Port> = [];

        switch (port.getType()) {
            case PortType.Map:
                for (const [portName, each] of port.getMapSubPorts()) {
                    portItems = portItems.concat(this.createPortItems(group, each));
                }
                break;

            case PortType.Stream:
                const subPort = port.getStreamSubPort();
                if (subPort) {
                    portItems = portItems.concat(this.createPortItems(group, subPort));
                }
                break;

            default:
                portItems.push({
                    group: group,
                });

        }
        return portItems;
    }

    public static createBlueprintOrOperatorElement(blueprint: BlueprintOrOperator): dia.Element {
        let portItems: Array<Port> = [];

        const inPort = blueprint.getPortIn();
        if (inPort) {
            portItems = portItems.concat(this.createPortItems("MainIn", inPort))
        }

        const outPort = blueprint.getPortOut();
        if (outPort) {
            portItems = portItems.concat(this.createPortItems("MainOut", outPort))
        }

        return new shapes.standard.Rectangle({
            size: {width: 100, height: 100},
            attrs: {
                root: {},
                body: {
                    fill: 'blue',
                    rx: 8,
                    ry: 8,
                },
                label: {
                    text: blueprint.getDisplayName(),
                    fill: 'white',
                }
            },
            ports: {
                groups: {
                    'MainIn': {
                        position: {
                            name: "top",
                        },
                        attrs: {
                            circle: {
                                r: 4,
                                fill: "yellow",
                            }
                        }
                    },
                    'MainOut': {
                        position: {
                            name: "bottom",
                        },
                        attrs: {
                            circle: {
                                r: 4,
                                fill: "cyan",
                            }
                        }
                    }
                },
                items: portItems,
            }
        });
    }
}

export interface ParsedPortInformation {
    instance: string
    delegate: string | undefined
    service: string | undefined
    directionIn: boolean
    port: string
}

export class SlangParsing {
    public static parseReferenceString(portReference: string): ParsedPortInformation | undefined {
        if (portReference.length === 0) {
            return undefined;
        }

        const parsedInfo: ParsedPortInformation = {
            instance: "",
            delegate: undefined,
            service: undefined,
            directionIn: false,
            port: ""
        };

        let separator = '';
        let operatorIdx = 0;
        let portIdx = 0;
        if (portReference.indexOf('(') !== -1) {
            parsedInfo.directionIn = true;
            separator = '(';
            operatorIdx = 1;
            portIdx = 0;
        } else if (portReference.indexOf(')') !== -1) {
            parsedInfo.directionIn = false;
            separator = ')';
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

        if (instancePart === '') {
            parsedInfo.instance = '';
            parsedInfo.service = 'main';
        } else {
            if (instancePart.indexOf('.') !== -1 && instancePart.indexOf('@') !== -1) {
                // Delegate and service must not both occur in string
                return undefined;
            }
            if (instancePart.indexOf('.') !== -1) {
                const instanceSplit = instancePart.split('.');
                if (instanceSplit.length === 2) {
                    parsedInfo.instance = instanceSplit[0];
                    parsedInfo.delegate = instanceSplit[1];
                }
            } else if (instancePart.indexOf('@') !== -1) {
                const instanceSplit = instancePart.split('@');
                if (instanceSplit.length === 2) {
                    parsedInfo.instance = instanceSplit[1];
                    parsedInfo.service = instanceSplit[0];
                }
            } else {
                parsedInfo.instance = instancePart;
                parsedInfo.service = 'main';
            }
        }

        return parsedInfo;
    }
}
import {PortOwner} from "./model/blueprint";
import {attributes, dia, shapes} from "jointjs";
import {PortModel, PortType} from "./model/port";
import SVGAttributes = attributes.SVGAttributes;

export class JointJSElements {
    private static inPortMarkup: string = "<path class='sl-port sl-port-in' d=''></path>";
    private static outPortMarkup: string = "<path class='sl-port sl-port-out' d=''></path>";

    private static inPortAttrs: SVGAttributes = {
        paintOrder: "stroke fill",
        d: "M 0 0 L 10 0 L 5 8 z",
        transform: "translate(0,-3)",
        magnet: true,
        stroke: "black",
        strokeWidth: 1,
    };
    private static outPortAttrs = JointJSElements.inPortAttrs;

    private static blueprintAttrs: SVGAttributes = {
        fill: "blue",
        stroke: "black",
        strokeWidth: 1,
        rx: 6,
        ry: 6,
    };

    private static operatorAttrs = Object.assign(
        JointJSElements.blueprintAttrs, {
            fillOpacity: 1,
        }
    );

    private static createPortItems(group: string, port: PortModel): Array<[PortModel, dia.Element.Port]> {
        let portItems: Array<[PortModel, dia.Element.Port]> = [];

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
                portItems.push([port, {
                    id: `${port.getPortReferenceString()}`,
                    group: group,
                    attrs: {
                        ".sl-port": {
                            fill: "cyan",
                        }
                    }
                }]);
        }
        return portItems;
    }

    public static createPortOwnerElement(portOwner: PortOwner): dia.Element {
        let portItems: Array<[PortModel, dia.Element.Port]> = [];

        const inPort = portOwner.getPortIn();
        if (inPort) {
            portItems = portItems.concat(this.createPortItems("MainIn", inPort))
        }

        const outPort = portOwner.getPortOut();
        if (outPort) {
            portItems = portItems.concat(this.createPortItems("MainOut", outPort))
        }

        return new shapes.standard.Rectangle({
            id: portOwner.getIdentity(),
            size: {width: 100, height: 100},
            attrs: {
                root: {},
                body: this.blueprintAttrs,
                label: {
                    text: portOwner.getDisplayName(),
                    fill: 'white',
                },
            },
            ports: {
                groups: {
                    'MainIn': {
                        position: {
                            name: "top",
                        },
                        markup: JointJSElements.inPortMarkup,
                        attrs: {
                            ".sl-port-in": JointJSElements.inPortAttrs,
                        },
                    },
                    'MainOut': {
                        position: {
                            name: "bottom",
                        },
                        markup: JointJSElements.outPortMarkup,
                        attrs: {
                            ".sl-port-out": JointJSElements.outPortAttrs,
                        },
                    }
                },
                items: portItems.map(portItem => portItem[1]),
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
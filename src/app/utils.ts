import {dia, shapes} from "jointjs";
import {OperatorModel} from "./model/operator";
import {BlueprintModel} from "./model/blueprint";
import Port = dia.Element.Port;
import {PortModel, PortType} from "./model/port";

export class JointJSElements {
    private static createPortItems(group: string, port: PortModel): Array<Port> {
        let portItems: Array<Port> = [];

        switch (port.getType()) {
            case PortType.Map:
                for (const [portName, each] of port.getPorts()) {
                    portItems = portItems.concat(this.createPortItems(group, each));
                }
                break;

            case PortType.Stream:
                const subPort = port.getPort();
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


    public static createBlueprintElement(blueprint: BlueprintModel): dia.Element {
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
                    text: `${blueprint.getPackageName(0)}\n${blueprint.getShortName()}`,
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

    public static createOperatorElement(operator: OperatorModel): dia.Element {
        return JointJSElements.createBlueprintElement(operator.getBlueprint());

    }
}


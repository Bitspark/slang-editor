import {attributes, dia, shapes} from "jointjs";
import {OperatorModel} from "./model/operator";
import {BlueprintModel} from "./model/blueprint";
import Port = dia.Element.Port;
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
        fillOpacity: .2,
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
                    attrs: {
                        ".sl-port": {
                            fill: "cyan",
                        }
                    }
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
                body: this.blueprintAttrs,
                label: {
                    text: `${blueprint.getPackageName(0)}\n${blueprint.getShortName()}`,
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
                items: portItems,
            }
        });
    }

    public static createOperatorElement(operator: OperatorModel): dia.Element {
        return JointJSElements.createBlueprintElement(operator.getBlueprint()).attr({body: this.operatorAttrs});
    }
}


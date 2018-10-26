import {dia, shapes} from "jointjs";
import {OperatorModel} from "./model/operator";
import {BlueprintModel} from "./model/blueprint";
import Port = dia.Element.Port;
import {PortType} from "./model/port";

export class JointJSElements {
    public static createBlueprintElement(blueprint: BlueprintModel): dia.Element {
        const portItems: Array<Port> = [];

        const inPort = blueprint.getPortIn();
        if (inPort) {
            const circleAttrs = {
                fill: "yellow"
            };

            if (inPort.getType() === PortType.Map) {
                circleAttrs["fill"] = "green";
            }

            portItems.push({
                group: 'MainIn',
                attrs: {
                    circle: circleAttrs,
                },
            })
        }

        const outPort = blueprint.getPortOut();
        if (outPort) {
            const circleAttrs = {
                fill: "yellow"
            };

            if (outPort.getType() === PortType.Map) {
                circleAttrs["fill"] = "green";
            }

            portItems.push({
                group: 'MainOut',
                attrs: {
                    circle: circleAttrs,
                },
            })
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
                            args: {},
                        },
                        attrs: {
                            circle: {
                                r: 4,
                            }
                        }
                    },
                    'MainOut': {
                        position: {
                            name: "bottom",
                            args: {},
                        },
                        attrs: {
                            circle: {
                                r: 4,
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


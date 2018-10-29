import {attributes, dia, shapes} from "jointjs";
import {BlackBox} from "../custom/nodes";
import {PortModel, PortType} from "../model/port";
import {JointPort} from "./port";

export class JointBlackBox extends shapes.standard.Rectangle {
    
    constructor(private blackBox: BlackBox) {        
        super({
            id: blackBox.getIdentity(),
            size: {width: 100, height: 100},
            attrs: {
                root: {},
                body: JointBlackBox.blueprintAttrs,
                label: {
                    text: blackBox.getDisplayName(),
                    fill: 'white',
                },
            },
            ports: {
                groups: {
                    'MainIn': {
                        position: {
                            name: "top",
                        },
                        markup: "<path class='sl-srv-main sl-port sl-port-in' d=''></path>",
                        attrs: {
                            ".sl-srv-main.sl-port": JointBlackBox.portAttrs,
                        },
                    },
                    'MainOut': {
                        position: {
                            name: "bottom",
                        },
                        markup: "<path class='sl-srv-main sl-port sl-port-in' d=''></path>",
                        attrs: {
                            ".sl-srv-main.sl-port": JointBlackBox.portAttrs,
                        },
                    },
                    'Delegate': {
                        position: {
                            name: "right",
                        },
                        markup: "<path class='sl-dlg sl-port' d=''></path>",
                        attrs: {
                            ".sl-dlg.sl-port": JointBlackBox.portAttrs,
                        },
                    }
                },
            }
        });
        
        this.addPorts(this.createPorts());
    }
    
    public addPorts(ports: Array<JointPort>): this {
        super.addPorts(ports);
        return this;
    }
    
    public getPorts(): Array<JointPort> {
        return super.getPorts() as Array<JointPort>;
    }
    
    private createPorts(): Array<JointPort> {        
        const blackBox = this.blackBox;
        const portItems: Array<JointPort> = [];

        const inPort = blackBox.getPortIn();
        if (inPort) {
            portItems.push.apply(portItems, JointBlackBox.createPortItems("MainIn", inPort))
        }

        const outPort = blackBox.getPortOut();
        if (outPort) {
            portItems.push.apply(portItems, JointBlackBox.createPortItems("MainOut", outPort))
        }

        for (const delegate of blackBox.getDelegates()) {
            if (delegate.getPortOut()) {
                portItems.push.apply(portItems, JointBlackBox.createPortItems("Delegate", delegate.getPortOut()!));
            }
            if (delegate.getPortIn()) {
                portItems.push.apply(portItems, JointBlackBox.createPortItems("Delegate", delegate.getPortIn()!));
            }
        }
        
        return portItems;
    }

    // STATIC
    
    private static portAttrs: attributes.SVGAttributes = {
        paintOrder: "stroke fill",
        d: "M 0 0 L 10 0 L 5 8 z",
        magnet: true,
        stroke: "black",
        strokeWidth: 1,
    };

    private static blueprintAttrs: attributes.SVGAttributes = {
        fill: "blue",
        stroke: "black",
        strokeWidth: 1,
        rx: 6,
        ry: 6,
    };

    private static createPortItems(group: string, port: PortModel): Array<JointPort> {
        let portItems: Array<JointPort> = [];

        switch (port.getType()) {
            case PortType.Map:
                for (const [_, each] of port.getMapSubPorts()) {
                    portItems.push.apply(this.createPortItems(group, each));
                }
                break;

            case PortType.Stream:
                portItems.push.apply(this.createPortItems(group, port.getStreamSubPort()));
                break;

            default:
                portItems.push(new JointPort(port, group));
        }
        return portItems;
    }

}
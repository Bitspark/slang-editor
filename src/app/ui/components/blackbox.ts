import {attributes, dia, shapes} from "jointjs";
import {BlackBox} from "../../custom/nodes";
import {PortModel, PortType} from "../../model/port";
import {PortComponent} from "./port";

export class BlackBoxComponent extends shapes.standard.Rectangle {
    
    constructor(private blackBox: BlackBox) {        
        super({
            id: blackBox.getIdentity(),
            size: {width: 100, height: 100},
            attrs: {
                root: {},
                body: BlackBoxComponent.blueprintAttrs,
                label: {
                    text: blackBox.getDisplayName(),
                    fill: 'white',
                },
            },
            ports: {
                groups: {}
            }
        });
        
        this.addPortGroups(this.createGroups());
        this.addPorts(this.createPorts());
    }
    
    public addPorts(ports: Array<PortComponent>): this {
        super.addPorts(ports);
        return this;
    }
    
    public getPorts(): Array<PortComponent> {
        return super.getPorts() as Array<PortComponent>;
    }
    
    private addPortGroups(portGroups: { [key: string]: dia.Element.PortGroup}) {
        const ports = this.get('ports');
        ports.groups = portGroups;
    }
    
    private createPorts(): Array<PortComponent> {        
        const blackBox = this.blackBox;
        const portItems: Array<PortComponent> = [];

        const inPort = blackBox.getPortIn();
        if (inPort) {
            portItems.push.apply(portItems, BlackBoxComponent.createPortItems("MainIn", inPort))
        }

        const outPort = blackBox.getPortOut();
        if (outPort) {
            portItems.push.apply(portItems, BlackBoxComponent.createPortItems("MainOut", outPort))
        }

        for (const delegate of blackBox.getDelegates()) {
            if (delegate.getPortOut()) {
                portItems.push.apply(portItems, BlackBoxComponent.createPortItems(delegate.getName(), delegate.getPortOut()!));
            }
            if (delegate.getPortIn()) {
                portItems.push.apply(portItems, BlackBoxComponent.createPortItems(delegate.getName(), delegate.getPortIn()!));
            }
        }
        
        return portItems;
    }
    
    private createGroups(): { [key: string]: dia.Element.PortGroup} {
        const portGroups: { [key: string]: dia.Element.PortGroup} = {
            'MainIn': {
                position: {
                    name: "top",
                },
                markup: "<path class='sl-srv-main sl-port sl-port-in' d=''></path>",
                attrs: {
                    ".sl-srv-main.sl-port": BlackBoxComponent.portAttrs,
                },
            },
            'MainOut': {
                position: {
                    name: "bottom",
                },
                markup: "<path class='sl-srv-main sl-port sl-port-in' d=''></path>",
                attrs: {
                    ".sl-srv-main.sl-port": BlackBoxComponent.portAttrs,
                },
            }
        };
        
        for (const delegate of this.blackBox.getDelegates()) {
            portGroups[delegate.getName()] = {
                position: {
                    name: "right",
                },
                markup: "<path class='sl-dlg sl-port' d=''></path>",
                attrs: {
                    ".sl-dlg.sl-port": BlackBoxComponent.portAttrs,
                },
            };
        }
        
        return portGroups;
    }
    
    public getPort(id: string): PortComponent {
        return super.getPort(id) as PortComponent;
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

    private static createPortItems(group: string, port: PortModel): Array<PortComponent> {
        let portItems: Array<PortComponent> = [];

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
                portItems.push(new PortComponent(port, group));
        }
        return portItems;
    }

}
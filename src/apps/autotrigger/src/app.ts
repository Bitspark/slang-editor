import {SlangApp} from "../../../slang/app";
import {AppModel} from "../../../slang/core/model/app";
import {OperatorPortModel, PortModel} from "../../../slang/core/model/port";
import {TypeIdentifier} from "../../../slang/definitions/type";
import {ComponentFactory} from "../../../slang/ui/components/factory";

export class AutoTriggerApp extends SlangApp {

	private static connectPorts(sourcePort: PortModel, triggerPort: PortModel) {
		if (sourcePort.getType().isElementaryPort()) {
			sourcePort.connect(triggerPort, false);
		} else if (sourcePort.getTypeIdentifier() === TypeIdentifier.Map) {
			for (const sub of sourcePort.getMapSubs()) {
				if (sub.getTypeIdentifier() === TypeIdentifier.Trigger) {
					sub.connect(triggerPort, false);
					return;
				}
			}
			for (const sub of sourcePort.getMapSubs()) {
				try {
					AutoTriggerApp.connectPorts(sub, triggerPort);
					return;
				} catch (e) {
					console.error(e);
				}
			}
		} else {
			console.error(`source port is of type ${sourcePort.getTypeIdentifier()} ${sourcePort.getType()} ${sourcePort.getType().isPrimitive()}`);
		}
	}

	constructor(app: AppModel, componentFactory: ComponentFactory) {
		super(app, componentFactory);
	}

	protected onReady(): void {
		this.app.subscribeDescendantCreated(OperatorPortModel, (port) => {
			if (port.isDirectionIn() && port.getTypeIdentifier() === TypeIdentifier.Trigger) {
				const subscription = port.getStreamPort().subscribeStreamTypeChanged((streamType) => {
					if (streamType) {
						if (!port.isConnected()) {
							const sourcePort = streamType.getSource();
							if (sourcePort !== null) {
								try {
									AutoTriggerApp.connectPorts(sourcePort, port);
								} catch (e) {
									console.error(e);
								}
							}
						}
					}
				});
				port.subscribeDisconnected(() => {
					subscription.unsubscribe();
				});
			}
		});
	}
}

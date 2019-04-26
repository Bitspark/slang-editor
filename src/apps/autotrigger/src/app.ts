import {SlangApp} from "../../../slang/app";
import {PortModel} from "../../../slang/core/abstract/port";
import {OperatorPortModel} from "../../../slang/core/models/port";
import {TypeIdentifier} from "../../../slang/definitions/type";

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
			sourcePort.connect(triggerPort, false);
		}
	}

	protected onReady(): void {
		this.app.subscribeDescendantCreated(OperatorPortModel, (port) => {
			if (!port.isDirectionIn() || port.getTypeIdentifier() !== TypeIdentifier.Trigger) {
				return;
			}
			const subscription = port.getStreamPort().subscribeStreamTypeChanged((streamType) => {
				if (port.isDestroying) {
					return;
				}
				if (!streamType) {
					return;
				}
				if (port.isConnected()) {
					return;
				}
				const sourcePort = streamType.getSource();
				if (sourcePort === null) {
					return;
				}
				try {
					AutoTriggerApp.connectPorts(sourcePort, port);
				} catch (e) {
					console.error(e);
				}
			});
			port.subscribeDestroyed(() => {
				subscription.unsubscribe();
			});
			port.subscribeDisconnected(() => {
				subscription.unsubscribe();
			});
		});
	}
}

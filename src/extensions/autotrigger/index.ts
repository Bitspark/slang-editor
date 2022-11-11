import {SlangExtension as SlangExtension} from "../../slang/extension";
import {PortModel} from "../../slang/core/abstract/port";
import {OperatorPortModel} from "../../slang/core/models";
import {TypeIdentifier} from "../../slang/definitions/type";

export class AutoTriggerExt extends SlangExtension {

	private static connectPorts(sourcePort: PortModel, triggerPort: PortModel) {
		if (sourcePort.getTypeIdentifier() !== TypeIdentifier.Map) {
			sourcePort.connect(triggerPort, false);
			return;
		}

		for (const sub of sourcePort.getMapSubs()) {
			if (sub.getTypeIdentifier() === TypeIdentifier.Trigger) {
				sub.connect(triggerPort, false);
				return;
			}
		}
		for (const sub of sourcePort.getMapSubs()) {
			try {
				AutoTriggerExt.connectPorts(sub, triggerPort);
				return;
			} catch (e) {
				console.error(e);
			}
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
					AutoTriggerExt.connectPorts(sourcePort, port);
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

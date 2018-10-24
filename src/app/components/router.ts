import {LandscapeModel} from "../model/landscape";
import {BlueprintModel} from "../model/blueprint";

export class RouterComponent {
    private openedBlueprint: BlueprintModel | null = null;
    
    constructor(private landscapeModel: LandscapeModel) {
        this.subscribe();
        this.publish();
    }
    
    public checkRoute(): void {
        this.checkState(window.history.state);
    }
    
    private checkState(state: any): void {
        console.log(state, this.openedBlueprint);
        if (!state) {
            if (this.openedBlueprint) {
                this.openedBlueprint.close();
            }
        } else {
            const type = state.type;
            if (type) {
                switch (type as string) {
                    case 'blueprint':
                        const blueprint = this.landscapeModel.findBlueprint(state.fullName as string);
                        if (blueprint) {
                            blueprint.open();
                            this.openedBlueprint = blueprint;
                        }
                        break;
                }
            }
        }
    }

    private subscribe(): void {
        const that = this;
        this.landscapeModel.subscribeBlueprintAdded(blueprint => {
            blueprint.subscribeOpenedChanged(opened => {
                if (opened) {
                    const title = `${blueprint.getFullName()} Blueprint | Slang Studio`;
                    const url = `blueprint/${blueprint.getFullName()}`;
                    window.history.pushState({type: 'blueprint', fullName: blueprint.getFullName()}, title, url);
                    that.openedBlueprint = blueprint;
                }
            });
        });
    }
    
    private publish() {
        const that = this;
        window.addEventListener('popstate', function (event: PopStateEvent) {
            that.checkState(event.state);
        });
    }
    
}
import {LandscapeModel} from "../model/landscape";
import {BlueprintModel} from "../model/blueprint";

export class RouterComponent {
    private openedBlueprint: BlueprintModel | null = null;
    
    constructor(private landscapeModel: LandscapeModel) {
        this.subscribe();
        this.publish();
    }
    
    public checkRoute(): void {
        const url = window.location.pathname;
        const paths = url.split('/');
        if (paths.length === 1) {
            if (this.openedBlueprint) {
                this.openedBlueprint.close();
            }
            return;
        } else {
            switch (paths[1]) {
                case 'blueprint':
                    this.openBlueprint(paths[2]);
            }
        }
        this.checkState(window.history.state);
    }
    
    private openBlueprint(fullName: string) {
        const blueprint = this.landscapeModel.findBlueprint(fullName);
        if (blueprint) {
            blueprint.open();
            this.openedBlueprint = blueprint;
        }
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
                        this.openBlueprint(state.fullName as string);
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
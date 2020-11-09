/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {Component} from 'react';
import React from 'react';

/**
 * Creates a video element for a new participant
 *
 * @param {String} name - the name of the new participant, to be used as tag
 *                        name of the video element.
 *                        The tag of the new element will be 'video<name>'
 * @return
 */
export class Participant extends Component<any, any>{

    private PARTICIPANT_MAIN_CLASS = 'participant main';
    private PARTICIPANT_CLASS = 'participant';

    private sendMessage:any;
    private name:string;
    private isMain:boolean;
    private isAutoplay:boolean;
    private isControl:boolean;

    private video = React.createRef<HTMLVideoElement>()
    private container = React.createRef<HTMLDivElement>()
    public rtcPeer: any;

    constructor(props: any) {
        super(props);

        this.sendMessage = props.sendMessage;
        this.name = props.name;
        this.isMain = props.isMain;
        this.isAutoplay = props.isAutoplay;
        this.isControl = props.isControl;

        Object.defineProperty(this, 'rtcPeer', { writable: true});
    }

    render() {
        return(
            <div
                ref={this.container}
                className={`participant ${this.isMain ? 'main' : ''}`}
                id={this.name}>
                <video
                    ref={this.video}
                    id={`video-${this.name}`}
                    autoPlay></video>
                <span>{this.name}</span>
            </div>
        );
    }

    getVideoElement = () => {
        return this.video.current;
    }

    offerToReceiveVideo = (error:any, offerSdp:any, wp:any) => {
        if (error) return console.error ("sdp offer error")
        console.log('Invoking SDP offer callback function');
        let msg =  { id : "receiveVideoFrom",
            sender : this.name,
            sdpOffer : offerSdp
        };
        this.sendMessage(msg);
    }


    onIceCandidate = (candidate: any, wp: any) => {
        console.log("Local candidate" + JSON.stringify(candidate));

        let message = {
            id: 'onIceCandidate',
            candidate: candidate,
            name: this.name
        };
        this.sendMessage(message);
    }

    public disposing() {
        try {
            console.log('Disposing participant ' + this.name);
            this.rtcPeer.dispose();
            this.container.current?.remove()
            // document.getElementById('participants')?.removeChild(this.container);
        } catch (e) {
            console.log(e)
        }
    }
}

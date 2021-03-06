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
import {Participant} from './Participant';
import adapter from 'webrtc-adapter';
import WebRtcPeer from 'kurento-utils';
import React from 'react';
type MyGroupType = {
    [key:string]: Participant;
}

const SDP_URL = 'wss://kurento_client:kurento_client_port/groupcall';

export class Utils extends React.Component<any, any>{

    private ws: WebSocket;
    private participants: MyGroupType = {};
    private participantNames: Array<string> = [];
    private name: string = '';
    private viewerChecked: boolean = false;
    private room: string = '';
    private leaveViewRoom: any;

    constructor(props:any) {
        super(props);
        this.leaveViewRoom = props.leaveViewRoom;

        this.state = {
            participantNames: []
        }


        this.ws = new WebSocket(SDP_URL);

        // navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia
        // window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection
        // window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate
        // window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription
        // window.URL = window.URL || window.webkitURL

        this.ws.onmessage = (message) => {
            let parsedMessage = JSON.parse(message.data);
            console.info('Received message: ' + message.data);

            switch (parsedMessage.id) {
                case 'existingParticipants':
                    this.onExistingParticipants(parsedMessage);
                    break;
                case 'newParticipantArrived':
                    this.onNewParticipant(parsedMessage);
                    break;
                case 'participantLeft':
                    this.onParticipantLeft(parsedMessage);
                    break;
                case 'receiveVideoAnswer':
                    this.receiveVideoResponse(parsedMessage);
                    break;
                case 'iceCandidate':
                    this.participants[parsedMessage.name].rtcPeer.addIceCandidate(parsedMessage.candidate, (error:any) => {
                        if (error) {
                            console.error("Error adding candidate: " + error);
                            return;
                        }
                    });
                    break;
                default:
                    console.error('Unrecognized message', parsedMessage);
            }
        }
    }

    public register(name: string, room: string, viewerChecked: boolean) {
        this.name = name;
        this.room = room;
        this.viewerChecked = viewerChecked;
        let message = {
            id : 'joinRoom',
            name : name,
            room : room,
            viewer : viewerChecked,
        }
        this.sendMessage(message);
    }

    onNewParticipant = (request:any) => {
        this.receiveVideo(request.name);
    }

    receiveVideoResponse = (result: any) => {
        this.participants[result.name].rtcPeer.processAnswer (result.sdpAnswer, (error: any) => {
            if (error) return console.error (error);
        });
    }

    // callResponse(message: any) {
    //     if (message.response != 'accepted') {
    //         console.info('Call not accepted by peer. Closing call');
    //         stop();
    //     } else {
    //         webRtcPeer.processAnswer(message.sdpAnswer, function (error:any) {
    //             if (error) return console.error (error);
    //         });
    //     }
    // }

    private onExistingParticipants(msg: any) {
        if (!this.viewerChecked) {
            let constraints = {
                audio: true,
                video: {
                    mandatory: {
                        maxWidth: 320,
                        maxFrameRate: 15,
                        minFrameRate: 15
                    }
                }
            };
            console.log(this.name + " registered in room " + this.room);
            let participant = new Participant({
                name:this.name,
                sendMessage:this.sendMessage,
                isMain:this.state.participantNames.length == 0,
                isAutoplay:true,
                isControl:false
            });
            this.participants[this.name] = participant;
            this.setState({participantNames: [...this.state.participantNames, this.name]})

            let video = participant.getVideoElement();

            let options = {
                localVideo: video,
                mediaConstraints: constraints,
                onicecandidate: participant.onIceCandidate.bind(participant)
            }
            participant.rtcPeer = WebRtcPeer.WebRtcPeer.WebRtcPeerSendonly(options,
                (error: any) => {
                    if (error) {
                        return console.error(error);
                    }
                    participant.rtcPeer.generateOffer(participant.offerToReceiveVideo.bind(participant));
                });

        }
        msg.data.forEach(this.receiveVideo);
    }

    public leaveRoom() {
        this.sendMessage({
            id : 'leaveRoom'
        });

        for ( var key in this.participants) {
            this.participants[key].disposing();
        }
        this.setState({participantNames: []})

        this.leaveViewRoom();

        this.ws.close();
    }

    public switchParticipating(viewerChecked: boolean) {
        this.viewerChecked = viewerChecked
        this.sendMessage({
            id : 'leaveRoom'
        });

        for ( let key in this.participants) {
            this.participants[key].disposing();
        }

        let message = {
            id: 'joinRoom',
            name: this.name,
            room: this.room,
            viewer: this.viewerChecked,
        }
        this.sendMessage(message);
    }

    receiveVideo = (sender: any) => {
        let participant = new Participant({
            name:sender,
            sendMessage:this.sendMessage,
            isMain:this.state.participantNames.length == 0,
            isAutoplay:true,
            isControl:false
        });
        this.participants[sender] = participant;
        this.setState({participantNames: [...this.state.participantNames, sender]})
        let video = participant.getVideoElement();

        let options = {
            remoteVideo: video,
            onicecandidate: participant.onIceCandidate.bind(participant)
        }

        participant.rtcPeer = WebRtcPeer.WebRtcPeer.WebRtcPeerRecvonly(options,
             (error: any) => {
                if(error) {
                    return console.error(error);
                }
                 participant.rtcPeer.generateOffer (participant.offerToReceiveVideo.bind(participant));
            });;
    }

    onParticipantLeft = (request: any) => {
        console.log('Participant ' + request.name + ' left');
        let participant = this.participants[request.name];
        participant.disposing();
        delete this.participants[request.name];
    }

    sendMessage = (message: any) => {
        let jsonMessage = JSON.stringify(message);
        console.log('Sending message: ' + jsonMessage);
        this.ws.send(jsonMessage);
    }

    dispose = () => {
        this.ws.close();
    }

    render() {
        let participantNames: [] = this.state.participantNames
        participantNames.map((x, i)=> {})
        return (<div id="participants">
            {participantNames.map((x, i)=> {
                return (this.participants[x].render())
            })}
        </div>);
    }
}

(function() {
    'use strict';

    angular
        .module('app.services')
        .service('EventSourceService', EventSourceService);

    EventSourceService.$inject = ['$filter'];
    function EventSourceService($filter) {
        this.registerEventSource = registerEventSource;
        this.closeEventSource = closeEventSource;
        
        var liveUpdatesEnabled = false;
        var eventSource = null;

        ////////////////

        function registerEventSource(callback) {
            if (typeof(EventSource) !== "undefined") {
                eventSource = new EventSource('/rest/events');
                liveUpdatesEnabled = true;

                eventSource.onmessage = function (event) {
                    try {
                        var evtdata = JSON.parse(event.data);
                        var topicparts = evtdata.topic.split('/');

                        var payload = JSON.parse(evtdata.payload);
                        callback(evtdata, topicparts, payload);

                        // if (evtdata.type === 'ItemStateEvent' || evtdata.type === 'ItemStateChangedEvent' || evtdata.type === 'GroupItemStateChangedEvent') {
                        //     var newstate = payload.value;
                        //     var item = $filter('filter')($rootScope.items, {name: topicparts[2]}, true)[0];
                        //     if (item && item.state !== payload.value) {
                        //         $rootScope.$apply(function () {
                        //             console.log("Updating " + item.name + " state from " + item.state + " to " + payload.value);
                        //             item.state = payload.value;

                        //             // no transformation on state
                        //             $rootScope.$emit('openhab-update', item);
                        //         });
                        //     }
                        // }
                    } catch (e) {
                        console.warn('SSE event issue: ' + e.message);
                    }
                }
                eventSource.onerror = function (event) {
                    console.error('SSE error, closing EventSource');
                    liveUpdatesEnabled = false;
                    this.close();
                    $timeout(loadItems, 5000);
                }
            }
        }

        function closeEventSource() {
            if (eventSource) {
                eventSource.close();
            }
        }

    }
})();
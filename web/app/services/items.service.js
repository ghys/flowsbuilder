(function() {
'use strict';

    angular
        .module('app.services')
        .service('ItemsService', ItemsService);

    ItemsService.$inject = ['$rootScope', '$http', '$q', '$timeout', '$interval', '$filter', '$location'];
    function ItemsService($rootScope, $http, $q, $timeout, $interval, $filter, $location) {
        this.getItem = getItem;
        this.getItems = getItems;
        this.getLocale = getLocale;
        this.onUpdate = onUpdate;
        this.sendCmd = sendCmd;
        this.reloadItems = reloadItems;

        var liveUpdatesEnabled = false, prevAudioUrl = '', locale = null, eventSource = null;

        ////////////////

        function onUpdate(scope, name, callback) {
            var handler = $rootScope.$on('openhab-update', callback);
            scope.$on('$destroy', handler);
            //watchItem(name);
            //longPollUpdates(name);
        }

        function loadItems() {
            $http.get('/rest/items')
            .then(function (data) {
                if (angular.isArray(data.data)) {
                    console.log("Loaded " + data.data.length + " openHAB items");
                    $rootScope.reconnecting = false;
                    $rootScope.items = data.data;
                    //if (!liveUpdatesEnabled) registerEventSource();
                } else {
                    console.warn("Items not found? Retrying in 5 seconds");
                    $rootScope.reconnecting = true;
                    $rootScope.items = [];
                    $timeout(loadItems, 5000);
                }
                $rootScope.$emit('openhab-update');
            },
            function (err) {
                console.warn("Error loading openHAB items... retrying in 5 seconds");
                $rootScope.reconnecting = true;
                $timeout(loadItems, 5000);
            });
        }

        function getItem(name) {
            var item = $filter('filter')($rootScope.items, {name: name}, true); 
            return (item) ? item[0] : null;
        }

        function getItems() {
            return $rootScope.items;
        }

        /**
         * Sends command to openHAB
         * @param  {string} item Item's id
         * @param  {string} cmd  Command
         */
        function sendCmd(item, cmd) {
            $http({
                method : 'POST',
                url    : '/rest/items/' + item,
                data   : cmd,
                headers: { 'Content-Type': 'text/plain' }
            }).then(function (data) {
                console.log('Command sent: ' + item + '=' + cmd);

                // should be handled by server push messages but their delivery is erratic
                // so perform a full refresh every time a command is sent
                //loadItems();
            });
        }

        /**
         * Returns a promise with the configured locale
         */
        function getLocale() {
            var deferred = $q.defer();

            if (locale) {
                deferred.resolve(locale);
            } else {
                $http.get('/rest/services/org.eclipse.smarthome.core.localeprovider/config')
                .then(function (response) {
                    locale = response.data.language + '-' + response.data.region;
                    deferred.resolve(locale);
                }, function(error) {
                    console.warn('Couldn\'t retrieve locale settings. Setting default to "en-US"');
                    locale = 'en-US';
                    deferred.resolve(locale);
                });
            }

            return deferred.promise;
        }

        function reloadItems() {
            loadItems();
        }
        
        function registerEventSource() {
            if (typeof(EventSource) !== "undefined") {
                var source = new EventSource('/rest/events');
                liveUpdatesEnabled = true;

                source.onmessage = function (event) {
                    try {
                        var evtdata = JSON.parse(event.data);
                        var topicparts = evtdata.topic.split('/');

                        if (evtdata.type === 'ItemStateEvent' || evtdata.type === 'ItemStateChangedEvent' || evtdata.type === 'GroupItemStateChangedEvent') {
                            var payload = JSON.parse(evtdata.payload);
                            var newstate = payload.value;
                            var item = $filter('filter')($rootScope.items, {name: topicparts[2]}, true)[0];
                            if (item && item.state !== payload.value) {
                                $rootScope.$apply(function () {
                                    console.log("Updating " + item.name + " state from " + item.state + " to " + payload.value);
                                    item.state = payload.value;

                                    // no transformation on state
                                    $rootScope.$emit('openhab-update', item);
                                });
                            }
                        }
                    } catch (e) {
                        console.warn('SSE event issue: ' + e.message);
                    }
                }
                source.onerror = function (event) {
                    console.error('SSE error, closing EventSource');
                    liveUpdatesEnabled = false;
                    this.close();
                    $timeout(loadItems, 5000);
                }
            }
        }

    }
})();

// credits: https://parkji.co.uk/2013/08/11/native-drag-and-drop-in-angularjs.html

(function () {
    'use strict';

    angular
        .module('app.shared')

        .directive('toolboxDraggable', function () {
            return function (scope, element) {
                // this gives us the native JS object
                var el = element[0];

                el.draggable = true;

                el.addEventListener(
                    'dragstart',
                    function (e) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('moduleId', this.id);
                        this.classList.add('drag');
                        return false;
                    },
                    false
                );

                el.addEventListener(
                    'dragend',
                    function (e) {
                        this.classList.remove('drag');
                        return false;
                    },
                    false
                );
            }
        })

        .directive('toolboxDroppable', function () {
            return {
                scope: {
                    drop: '&',
                    bin: '='
                },
                link: function (scope, element) {
                    // again we need the native object
                    var el = element[0];

                    el.addEventListener(
                        'dragover',
                        function (e) {
                            e.dataTransfer.dropEffect = 'move';
                            // allows us to drop
                            if (e.preventDefault) e.preventDefault();
                            this.classList.add('over');
                            return false;
                        },
                        false
                    );

                    el.addEventListener(
                        'dragenter',
                        function (e) {
                            this.classList.add('over');
                            return false;
                        },
                        false
                    );

                    el.addEventListener(
                        'dragleave',
                        function (e) {
                            this.classList.remove('over');
                            return false;
                        },
                        false
                    );

                    el.addEventListener(
                        'drop',
                        function (e) {
                            // Stops some browsers from redirecting.
                            if (e.stopPropagation) e.stopPropagation();

                            this.classList.remove('over');

                            var itemId = e.dataTransfer.getData('moduleId');
                            // call the passed drop function
                            scope.$apply(function (scope) {
                                var fn = scope.drop();
                                if ('undefined' !== typeof fn) {
                                    fn(itemId, e.offsetX, e.offsetY);
                                }
                            });

                            return false;
                        },
                        false
                    );
                }
            }
        });

})();

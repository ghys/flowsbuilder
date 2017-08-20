(function() {
    'use strict';

    angular
        .module('app.shared')
        .directive('resize', resize);


    resize.$inject = ['$log', '$window'];
    function resize($log, $window) {

        return function (scope, element) {

            var w = angular.element($window);
            //$log.info('w: ' + w[0]);
            scope.getWindowDimensions = function () {
                return { 'h': w[0].innerHeight, 'w': w[0].innerWidth };
            };
            scope.$watch(scope.getWindowDimensions, function (newValue, oldValue) {
                scope.windowHeight = newValue.h;
                scope.windowWidth = newValue.w;

                scope.style = function () {
                    return {
                        'height': (newValue.h - 101) + 'px',
                        'width': '100%' // (newValue.w - 400) + 'px'
                    };
                };

            }, true);

            w.bind('resize', function () {
                scope.$apply();
            });
        }

    }

})();
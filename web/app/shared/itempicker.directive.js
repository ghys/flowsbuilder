(function() {
    'use strict';

    angular
        .module('app.shared')
        .directive('itemTypeIcon', ItemTypeIcon)
        .directive('itemPicker', ItemPicker);

    function ItemTypeIcon() {
        var directive = {
            link: link,
            restrict: 'AE',
            template:
                '<strong ng-if="type === \'Number\'" title="Number" style="font-size: 1.2em; line-height: 0.9em; margin: -0.2em 0.1em;">#</strong>' +
                '<i ng-if="type !== \'Number\'" title="{{type}}" class="glyphicon glyphicon-{{getGlyph()}}"></i>',
            scope: {
                type: '='
            }
        };
        return directive;

        function link(scope, element, attrs) {
            scope.getGlyph = function () {
                switch (scope.type) {
                   case 'Group': return 'th-large';
                    case 'Switch': return 'off';
                    case 'String': return 'font';
                    case 'Number': return 'usd';
                    case 'Color': return 'tint';
                    case 'DateTime': return 'calendar';
                    case 'Dimmer': return 'sort-by-attributes';
                    case 'Rollershutter': return 'oil';
                    case 'Contact': return 'resize-small';
                    case 'Player': return 'fast-forward';
                    case 'Image': return 'picture';
                    case 'Location': return 'map-marker';
                    case 'Call': return 'earphone';
                    default: return 'asterisk';
                }
            };
        }
    }

    ItemPicker.$inject = ['$filter', 'ItemsService'];
    function ItemPicker($filter, ItemsService) {
        var directive = {
            bindToController: true,
            link: link,
            controller: ItemPickerController,
            controllerAs: 'vm',
            restrict: 'AE',
            template:
                '<ui-select ng-model="vm.selectedItem" theme="selectize" title="Choose an openHAB item">' +
                '  <ui-select-match placeholder="Search or select an openHAB item"><item-type-icon type="$select.selected.type"></item-type-icon>&nbsp;{{$select.selected.name}}</ui-select-match>' +
                '  <ui-select-choices repeat="item in vm.itemlist | filter: $select.search">' +
                '    <div><item-type-icon type="item.type"></item-type-icon>&nbsp;<span ng-bind-html="item.name | highlight: $select.search"></div>' +
                '    <small ng-bind-html="item.label | highlight: $select.search"></small>' +
                '  </ui-select-choices>' +
                '</ui-select>',
            scope: {
                ngModel: '=',
                filterType: '@',
                includeGroups: '=?'
            }
        };
        return directive;

        function link(scope, element, attrs) {
        }
    }
    ItemPickerController.$inject = ['$scope', '$filter', 'ItemsService'];
    function ItemPickerController ($scope, $filter, ItemsService) {
        var vm = this;
        vm.selectedItem = ItemsService.getItem(this.ngModel);
        vm.itemlist = ItemsService.getItems();
        if (this.filterType) {
            vm.itemlist = $filter('filter')(vm.itemlist, function (item) {
                if (vm.includeGroups) {
                    return !item.type.indexOf(vm.filterType) || !item.type.indexOf('Group');
                } else {
                    return !item.type.indexOf(vm.filterType);
                }
            });
        }

        $scope.$watch("vm.selectedItem", function (newitem, oldvalue) {
            if (newitem && newitem.name)
                $scope.vm.ngModel = newitem.name;
        });
        
    }
})();
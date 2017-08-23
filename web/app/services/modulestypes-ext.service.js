(function() {
    'use strict';

    angular
        .module('app.services')
        .service('ModulesTypesExtensions', ModulesTypesExtensionsService)
        .value('ModuleTypeExtensionHooks', {

            // triggers
            'timer.TimeOfDayTrigger': {
                defaultLabel: function (moduletype, config) {
                    if (!config.time) return;
                    return 'When the time is ' + config.time;
                }
            },
            'core.ItemCommandTrigger': {
                defaultLabel: function (moduletype, config) {
                    if (!config.itemName || !config.command) return;
                    return 'When ' + config.itemName + ' received command ' + config.command;
                }
            },
            'core.ItemStateUpdateTrigger': {
                defaultLabel: function (moduletype, config) {
                    if (!config.itemName) return;
                    return 'When ' + config.itemName + ' was updated' +
                        ((config.state) ? ' to ' + config.state : '');
                }
            },
            'core.ItemStateChangeTrigger': {
                defaultLabel: function (moduletype, config) {
                    if (!config.itemName) return;
                    return 'When ' + config.itemName + ' changed' +
                        ((config.previousState) ? ' from ' + config.previousState : '') +
                        ((config.state) ? ' to ' + config.state : '');
                }
            },
            'core.ChannelEventTrigger': {
                defaultLabel: function (moduletype, config) {
                    if (!config.channelUID) return;
                    return 'When channel ' + config.channelUID + ' was triggered';
                }
            },

            // conditions
            'script.ScriptCondition': {
                negate: function (moduletype, config) {
                    if (!config.script) return;
                    config.script = '!(' + config.script + ')';
                }
            },
            'timer.DayOfWeekCondition': {
                defaultLabel: function (moduletype, config) {
                    if (!config.days || !config.days.length) return;
                    return 'If the day is ' + config.days.join(',');
                },
                negate: function (moduletype, config) {
                    if (!config.days) return;
                    var invert = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].filter(function (x) {
                        return config.days.indexOf(x) < 0;
                    });
                    config.days = invert;
                }
            },
            'core.ItemStateCondition': {
                defaultLabel: function (moduletype, config) {
                    if (!config.itemName || !config.operator || !config.state) return;
                    return 'If ' + config.itemName + ' ' + config.operator + ' ' + config.state;
                },
                negate: function (moduletype, config) {
                    if (!config.itemName || !config.state) return;
                    switch (config.operator) {
                        case '=': config.operator = '!='; break;
                        case '!=': config.operator = '='; break;
                        case '<': config.operator = '>='; break;
                        case '>': config.operator = '<='; break;
                        case '<=': config.operator = '>'; break;
                        case '>=': config.operator = '<'; break;
                        default: throw 'during negation of core.ItemStateCondition: invalid operator';
                    }
                }
            },

            // actions
            'core.ItemCommandAction': {
                defaultLabel: function (moduletype, config) {
                    if (!config.itemName || !config.command) return;
                    return 'Send command ' + config.command + ' to ' + config.itemName;
                }
            },
            'media.SayAction': {
                defaultLabel: function (moduletype, config) {
                    if (!config.text) return;
                    return 'Say "' + config.text + '"';
                }
            },
            'media.PlayAction': {
                defaultLabel: function (moduletype, config) {
                    if (!config.sound) return;
                    return 'Play ' + config.sound;
                }
            },


        });

    ModulesTypesExtensionsService.$inject = ['ModuleTypeExtensionHooks', 'RuleEngineService', '$filter'];
    function ModulesTypesExtensionsService(ModuleTypeExtensionHooks, RuleEngineService, $filter) {
        this.getDefaultLabel = getDefaultLabel;
        this.negateCondition = negateCondition;

        var module_types = null;

        RuleEngineService.getModuleTypes().then (function (ret) {
            module_types = ret;
        });

        ////////////////

        function negateCondition(moduleTypeUid, config) {
            var moduleTypeHooks = ModuleTypeExtensionHooks[moduleTypeUid];
            if (!moduleTypeHooks || !moduleTypeHooks.negate || !config) return null;
            var negatedConfig = angular.copy(config);
            moduleTypeHooks.negate(moduleTypeUid, negatedConfig);
            return negatedConfig;
        }

        function getDefaultLabel(moduleTypeUid, category, config) {
            var label = "";
            var moduleTypeHooks = ModuleTypeExtensionHooks[moduleTypeUid];
            if (moduleTypeHooks && moduleTypeHooks.defaultLabel && config) {
                label = moduleTypeHooks.defaultLabel(moduleTypeUid, config);
            }
            if (!label) {
                var module_type = $filter('filter')(module_types.all, { uid: moduleTypeUid })[0];
                label = ((category === 'trigger') ? 'When ' : (category === 'condition') ? 'If ' : '') + module_type.label;
            }
            return label;
        }
    }
})();
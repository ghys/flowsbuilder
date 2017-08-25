(function() {
    'use strict';

    angular
        .module('app.services')
        .service('FlowCompiler', FlowCompiler);

    FlowCompiler.$inject = ['ModulesTypesExtensions', 'RuleEngineService', '$filter', '$q', '$timeout', 'flowchartConstants'];
    function FlowCompiler(ModulesTypesExtensions, RuleEngineService, $filter, $q, $timeout, flowchartConstants) {
        this.buildFlow = buildFlow;

        var module_types = null;

        function log(context, message, level) {
            context.logs.push({ message: message, level: level });
        }

        function getInboundEdges(node, context) {
            var connectorId = node.connectors.find(function (c) { return c.type === flowchartConstants.topConnectorType }).id;
            return $filter('filter')(context.flow.edges, function (e) { return e.destination === connectorId });
        }

        function getOutboundEdges(node, context, path) {
            var connectorId = (path)
                    ? node.connectors.find(function (c) { return c.type === flowchartConstants.bottomConnectorType && c.path === path }).id
                    : node.connectors.find(function (c) { return c.type === flowchartConstants.bottomConnectorType }).id;

            return $filter('filter')(context.flow.edges, function (e) { return e.source === connectorId });
        }
        
        function getSourceNode(edge, context) {
            return context.flow.nodes.find(function (n) {
                return n.connectors.find(function (c) {
                    return c.id === edge.source && c.type === flowchartConstants.bottomConnectorType;
                });
            });
        }

        function getDestinationNode(edge, context) {
            return context.flow.nodes.find(function (n) {
                return n.connectors.find(function (c) {
                    return c.id === edge.destination && c.type === flowchartConstants.topConnectorType;
                });
            });
        }

        function createRule(uid, name, description, context) {
            var rule = {
                uid: uid,
                name: name,
                description: description,
                visibility: 'HIDDEN',
                enabled: true,
                triggers: [],
                conditions: [],
                actions: [],
                tags: [context.flowId]
            };

            context.rules.push(rule);
            context.currentRule = rule;
            context.ruleModuleUidCounter = 1;
            return rule;
        }

        function checkModuleConfig(node, context) {
            if (module_types && node.module_config) {
                var module_type = $filter('filter')(module_types.all, {uid: node.module_type_uid})[0];
                angular.forEach(module_type.configDescriptions, function (configDesc) {
                    if (configDesc.required && !node.module_config[configDesc.name]) {
                        throw 'Node ' + node.id + ' - Required module configuration parameter "' + (configDesc.label || configDesc.name) + '"' +
                            ((configDesc.description) ? ' (' + configDesc.description + ')' : '') + ' is not set';
                    }

                    // TODO add other checks - type check, min/max, limit to options etc.
                });
            }
        }

        function checkNodeNeighbors(node, parentNode, context) {
            var ret = {};
            switch (node.type) {
                case 'trigger':
                    var next = getOutboundEdges(node, context);
                    if (next.length < 1)
                        throw 'Trigger is isolated';
                    if (next.length > 1)
                        throw 'Trigger has more than one path';
                    
                    if (next.length == 1) ret.next = getDestinationNode(next[0], context);
                    break;
                case 'condition':
                    var inbound = getInboundEdges(node, context);
                    if (inbound.length > 1)
                        throw 'Condition node has more than one inbound path';
                    var thenEdges = getOutboundEdges(node, context, 'true');
                    var elseEdges = getOutboundEdges(node, context, 'false');

                    if (thenEdges.length < 1)
                        throw 'Condition node cannot be a leaf or have only an "else" path. Add other nodes beneath its green ("then") path';
                    if (thenEdges.length > 1)
                        throw 'Condition node has more than one green ("then") path';
                    if (elseEdges.length > 1)
                        throw 'Condition node has more than one red ("else") path';
                    
                    if (inbound.length == 1)   ret.prev = getSourceNode(inbound[0], context);
                    if (thenEdges.length == 1) ret.nextThen = getDestinationNode(thenEdges[0], context);
                    if (elseEdges.length == 1) ret.nextElse = getDestinationNode(elseEdges[0], context);
                    break;
                case 'action':
                    var inbound = getInboundEdges(node, context);
                    if (inbound.length > 1)
                        throw 'Action node has more than one inbound path';
                    var outbound = getOutboundEdges(node, context);
                    if (outbound.length > 1)
                        throw 'Action node has more than one outbound path';

                    if (inbound.length == 1)  ret.prev = getSourceNode(inbound[0], context);
                    if (outbound.length == 1) ret.next = getDestinationNode(outbound[0], context);
                    break;
            }

            return ret;
        }

        function processNode(node, parentNode, context) {
            var nodeName = node.name || ModulesTypesExtensions.getDefaultLabel(node.module_type_uid, node.category, node.module_config);
            log(context, 'Processing node ' + node.id + ': ' + nodeName);
            checkModuleConfig(node, context);
            var neighbors = checkNodeNeighbors(node, parentNode, context);

            switch (node.type) {
                case 'trigger':
                    // add the trigger to current rule
                    context.currentRule.triggers.push({
                        id: node.id,
                        label: nodeName,
                        description: node.description,
                        configuration: node.module_config,
                        type: node.module_type_uid
                    });

                    if (neighbors.next) {
                        processNode(neighbors.next, node, context);
                    }
                    break;
                case 'condition':
                    if (!neighbors.nextElse) {
                        // no else path
                        if (parentNode.type !== 'action') {
                            // parent is trigger or another condition: simply add this condition to the current rule
                            context.currentRule.conditions.push({
                                id: node.id,
                                label: nodeName,
                                description: node.description,
                                configuration: angular.copy(node.module_config),
                                type: node.module_type_uid
                            });

                            processNode(neighbors.nextThen, node, context);
                        } else {
                            // parent is action: create a new rule and add this condition to it

                            var nextRuleUid = context.ruleUidPrefix + '_' + node.id;
                            context.parentRule = context.currentRule;
                            log(context, 'Starting a new rule for the condition following an action: ' + nextRuleUid, 'INFO');

                            // create the 'run rules' action in the current rule
                            context.parentRule.actions.push({
                                id: node.id,
                                label: 'Proceed to condition: ' + nodeName,
                                description: 'Run next rule: ' + nextRuleUid,
                                inputs: {},
                                configuration: {
                                    considerConditions: true,
                                    ruleUIDs: [ nextRuleUid ]
                                },
                                type: 'core.RunRuleAction'
                            });

                            var nextRule = createRule(nextRuleUid,
                                nodeName,
                                'Created by Flows Builder for a condition following an action. Do not run separately, will be overwritten if the flow is published again.',
                                context);
                            context.ruleUidPrefix = nextRuleUid;

                            // add the condition to the new rule
                            context.currentRule.conditions.push({
                                id: node.id,
                                label: nodeName,
                                description: node.description,
                                configuration: angular.copy(node.module_config),
                                type: node.module_type_uid
                            });

                            processNode(neighbors.nextThen, node, context);
                        }
                    } else {
                        // else path present
                        // start 2 new rules

                        var nextRuleUidThen = context.ruleUidPrefix + '_' + node.id;
                        var nextRuleUidElse = context.ruleUidPrefix + '_' + node.id + 'neg';
                        context.parentRule = context.currentRule;
                        var currentRule = context.currentRule;

                        // create the 'run rules' action in the current rule
                        context.parentRule.actions.push({
                            id: node.id,
                            label: 'Proceed to condition: ' + nodeName,
                            description: 'Run next rules: ' + nextRuleUidThen + ' & ' + nextRuleUidElse,
                            inputs: {},
                            configuration: {
                                considerConditions: true,
                                ruleUIDs: [ nextRuleUidThen, nextRuleUidElse ]
                            },
                            type: 'core.RunRuleAction'
                        });
                         
                        // first, one with the condition as-is
                        
                        log(context, 'Starting a new rule for the "then" path: ' + nextRuleUidThen, 'INFO');

                        var nextRule = createRule(nextRuleUidThen,
                            nodeName,
                            'Created by Flows Builder for the "then" path of a condition. Do not run separately, will be overwritten if the flow is published again.',
                            context);
                        context.ruleUidPrefix = nextRuleUidThen;

                        context.currentRule.conditions.push({
                            id: node.id,
                            label: nodeName,
                            description: node.description,
                            inputs: {},
                            configuration: angular.copy(node.module_config),
                            type: node.module_type_uid
                        });

                        processNode(neighbors.nextThen, node, context);

                        // then a second with the condition inversed

                        var nextRule = createRule(nextRuleUidElse,
                            'NOT(' + nodeName + ')',
                            'Created by Flows Builder for the "else" path of a condition. Do not run separately, will be overwritten if the flow is published again.',
                            context);
                        context.ruleUidPrefix = nextRuleUidElse;

                        var negatedConfig = ModulesTypesExtensions.negateCondition(node.module_type_uid, angular.copy(node.module_config));
                        if (!negatedConfig)
                            throw 'Condition module type ' + node.module_type_uid + ' has no known negation function! "Else" branches cannot be used with this module type';

                        context.currentRule.conditions.push({
                            id: node.id,
                            label: 'NOT(' + nodeName + ')',
                            description: node.description,
                            inputs: {},
                            configuration: negatedConfig,
                            type: node.module_type_uid
                        });

                        log(context, 'Starting a new rule for the "else" path: ' + nextRuleUidElse, 'INFO');
                        processNode(neighbors.nextElse, node, context);
                    }
                    break;
                case 'action':
                    // simply add the action to the current rule
                    context.currentRule.actions.push({
                        id: node.id,
                        label: nodeName,
                        description: node.description,
                        inputs: {},
                        configuration: angular.copy(node.module_config),
                        type: node.module_type_uid
                    });

                    if (neighbors.next) {
                        processNode(neighbors.next, node, context);
                    }
                break;
            }

        }
        
        ////////////////


        function buildFlow(flow, flowid) {
            //var deferred = $q.defer();

            var context = {
                flow: flow, // the entire flow, for reference
                flowId: flowid, // the identifier of the flow
                //deferred: deferred, // the deferred object, to report progress
                rules: [], // the current set of built rules
                ruleUidPrefix: flow.id, // the current prefix for new rules
                currentRule: null, // the rule being built
                parentRule: null, // the rule that is supposed to call the one being built
                ruleModuleUidCounter: 1, // the counter for giving ids to rule modules
                logs: [] // the messages collected during the compilation process
            };

            try {
                // Start with all the trigger nodes
                var triggers = $filter('filter')(flow.nodes, { type: 'trigger' });
                angular.forEach(triggers, function (trigger) {
                    context.ruleUidPrefix = flowid + ':' + trigger.id;

                    createRule(context.ruleUidPrefix,
                        (flow.name || flowid) + ' - ' + trigger.id + ': ' +
                        (trigger.name || ModulesTypesExtensions.getDefaultLabel(trigger.module_type_uid, trigger.category, trigger.module_config)),
                        flow.description || 'Created with Flows Builder - will be overwritten if the workflow is published again',
                        context);

                    processNode(trigger, null, context);
                });
            } catch (e) {
                log(context, 'ERROR: ' + e, 'ERROR');
                context.error = e;
            }

            //deferred.resolve(context.rules);
            //return deferred.promise;

            return {
                rules: context.rules,
                logs: context.logs,
                error: context.error
            }
        }

        RuleEngineService.getModuleTypes().then (function (ret) {
            module_types = ret;
        });

    }
})();
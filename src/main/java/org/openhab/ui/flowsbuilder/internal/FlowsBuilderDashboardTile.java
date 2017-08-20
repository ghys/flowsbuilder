/**
 * Copyright (c) 2015-2016 by the respective copyright holders.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 */
package org.openhab.ui.flowsbuilder.internal;

import org.openhab.ui.dashboard.DashboardTile;
import org.osgi.service.http.HttpService;
import org.osgi.service.http.NamespaceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The dashboard tile and resource registering for the Flows Builder app
 *
 * @author Yannick Schaus
 *
 */
public class FlowsBuilderDashboardTile implements DashboardTile {

    @Override
    public String getName() {
        return "Flows Builder";
    }

    @Override
    public String getUrl() {
        return "../flowsbuilder/index.html";
    }

    @Override
    public String getOverlay() {
        return null;
    }

    @Override
    public String getImageUrl() {
        return "../flowsbuilder/tile.png";
    }

    public static final String FLOWSBUILER_ALIAS = "/flowsbuilder";

    private static final Logger logger = LoggerFactory.getLogger(FlowsBuilderDashboardTile.class);

    protected HttpService httpService;

    protected void activate() {
        try {
            httpService.registerResources(FLOWSBUILER_ALIAS, "web", null);
            logger.info("Started Flows Builder at " + FLOWSBUILER_ALIAS);
        } catch (NamespaceException e) {
            logger.error("Error during Flows Builder startup: {}", e.getMessage());
        }
    }

    protected void deactivate() {
        httpService.unregister(FLOWSBUILER_ALIAS);
        logger.info("Stopped Flows Builder");
    }

    protected void setHttpService(HttpService httpService) {
        this.httpService = httpService;
    }

    protected void unsetHttpService(HttpService httpService) {
        this.httpService = null;
    }

}

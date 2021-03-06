
define(["common"], function(common) {
    
    return {
        /**
         * Opens up the download data dialog.
         */
        showDownloadDialog: function(query) {
            var self = this;
            // adjust query and messages
            var isASpecies = !(query.species === "highest" || query.species === "lowest");
            var species = (isASpecies) ? query.species : "all species*";
            var yearMsg;
            if(query.startYear === query.endYear) {
                yearMsg = "during <b>" + query.startYear + "</b>";
            } else {
                yearMsg = "between <b>" + query.startYear + "-" + query.endYear + "</b>";
            }
            common.setModal(true, "", {id: "download-dialog", showBackground: true});
            // create dialog box
            var downloadDialog = $("#download-dialog")
                //.addClass("inner-container-style")
                .append("<span style='font-size:18px;font-weight:bolder;'>Download Map Data<span><hr />")
                .append(
                    $("<p></p>").html(
                        "Download <b>" + query.contaminant + "</b> data " + 
                        "for <b>" + species + "</b> " + yearMsg + "?"
                    )
                );
            if(!isASpecies) {
                downloadDialog.append(
                    $("<p></p>").html(
                        "*Highest or lowest average concentration are not available. " +
                        "Instead data for all species will be downloaded."
                    ).css({'font-size': '10px', 'text-align': 'center'})
                );
            }
            $("<p>").appendTo(downloadDialog).html(
                "Click the Download button to download data for the species, contaminant, and time period shown on the map.  The data table will include the data for all locations across the state that match these parameters."
            );
            var buttonStyle = {
                'display': 'inline-block',
                'width': 70, 
                'height': 20, 
                'line-height': '20px', 
                'margin': "0 auto", 
                'text-align': 'center'
            };
            $("<div id='download-buttons'></div>").appendTo(downloadDialog)
                .css('text-align', 'center')
                .append(
                    $("<div id='download-cancel'>Cancel</div>")
                        .addClass("button")
                        .css(buttonStyle)
                        .click(function() { common.setModal(false); })
                )
                .append(
                    $("<div id='download-confirm'>Download</div>")
                        .addClass("button")
                        .css(buttonStyle)
                        .css('margin-left', '4px')
                        .click(function(e) {
                            e.stopPropagation();
                            self.downloadQueryData(downloadDialog, query);
                        })
                );
        }, 
        
        /**
         * Start download automatically (uses iFrame to achieve this), as well as provide updates and manual download
         * link.
         * @param {jQuery} container - jQuery object for DOM element in which to display download updates/link. As 
         *    well, iFrame to create the auto-start download is created in it, so it must be specified correctly.
         * @param {Object} query - Query/parameter object
         */
        downloadQueryData: function(container, query) {
            container.html(
                $("<div id='download-message'></div>")
                .css({
                    'text-align': 'center', 
                    'margin': '20px 0', 
                    'font-size': 13
                })
                .html("<img src='images/loader.gif' alt='loading' /> Preparing file for download..")
            );
            var buttonStyle = {
                'display': 'inline-block',
                'width': 70, 
                'height': 20, 
                'line-height': '20px', 
                'margin': "0 auto", 
                'text-align': 'center'
            };
            var buttonContainer = $("<div id='download-buttons'></div>").appendTo(container)
                .css('text-align', 'center')
                .append(
                    $("<div id='download-cancel'>Cancel</div>")
                        .addClass("button")
                        .css(buttonStyle)
                        .click(function() {
                            container.html();
                            common.setModal(false);
                        })
                );
            var downloadUrl = "lib/downloadQueryData.php"+"?species="+query.species+"&contaminant="+query.contaminant+"&startYear="+query.startYear+"&endYear="+query.endYear;
            $("#download-message")
                .append(
                    // use iframe to automatically start download
                    $("<iframe src='"+downloadUrl+"'></iframe>")
                        .css({
                            'display': 'block',
                            'width': 280, 
                            'height': 15, 
                            'border': 'none'
                        })
                        .ready(function() {
                            $("#download-message").html(
                                "Download should begin automatically. If it does not, <a href='"+downloadUrl+"'>click here</a> to begin download manually."
                            );
                            buttonContainer.find("#download-cancel").html("Close");
                        })
                )
                .append(
                    "For information on the data and columns, please see the <a href='metadata.html' target='_blank'>metadata page</a>."
                );
        }
    };
    
});
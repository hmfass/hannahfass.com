/**
 * Copyright (C) 2012 Neil Goodman
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, 
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished 
 * to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR 
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * A simple jQuery plugin that will fade-in and fade-out a larger preview
 * image from a set of thumbnail images.
 *
 * To use simply call jQuery.hoverPreview() on an element that contains a set of
 * child <img> tags that have been marked up for the plugin. The plugin will look for
 * the attribute data-preview on the <img> tags which should contain a URL pointing to the
 * larger preview image.
 *
 * This plugin depends on jQuery UI Widget.
 *
 * Example:
 * 
 * @code
 * <div id="preview></div>
 * 
 * <div id="thumbs">
 *   <img data-preview="img/image-01-full.png" src="img/image-01-thumb.png" />
 *   <img data-preview="img/image-02-full.png" src="img/image-02-thumb.png" />
 *   <img data-preview="img/image-02-full.png" src="img/image-02-thumb.png" />
 * </div>
 *
 * <script type="application/javascript">
 *   $("#thumbs").hoverPreview();
 * </script>
 * @endcode 
 *
 * Options:
 *
 * The default options are to place the full preview image into the element with the ID
 * "preview" and to attach the hover event and extra the data-preview data from all img
 * tags that are chlidren of the jQuery collection that the plugin is called from. You can
 * change these defaults by given an options object to the plugin method.
 *
 * Example:
 *
 * @code
 * <script type="application/javascript">
 *   $("#thumbs").hoverPreview({
 *     previewContainer: "#myPreviewContainer",
 *     dataSelector:     ".items",                   // This would be relative to #thumbs
 *     activeClass:      "itemactive",               // Name of the class that represents an active item.
 *     imageLink:        ".link",                    // Selector for the anchor tag that will link to the image.
 *     transition:       "both"                      // Can be click, hover, or both. Decides which event to trigger the fade animation on.
 *     change:           function(event, element) {} // This event fires when the above transition event occurs.
 *   });
 * </script>
 * @endcode
 *
 * @author  Neil Goodman, http://neilgoodman.net
 * @date    March 4, 2012
 * @version 1.0
 * @class   HoverPreview
 */
(function ($) {
    $.widget('ng.hoverPreview', {
        options: {
            previewContainer: '#preview',
            dataSelector: 'img',
            activeClass: 'active',
            imageLink: '.preview-link',
            transition: 'both'
        },
        
        /**
         * Plugin constructor.
         *
         * @return The jQuery object that the plugin was called on.
         * @memberof HoverPreview
         */
        _create: function () {
            var self = this;
            var $element = this.element;
        
            // Fetch the preview, thumbs, and full-image link.
            this.$preview = $(this.options.previewContainer);
            this.$thumbs  = $element.find(this.options.dataSelector);
            this.$link    = $(this.options.imageLink);

            this._preload();
            this._bind();
        },
        
        /**
         * Preload all images.
         */
        _preload: function () {
            var self = this;
            
            this.previewImages = [];
            this.$thumbs.each(function() {
                // Extract the data-preview attribute and preload image.
                var $item = $(this);
                var previewURL = $item.attr('data-preview');
                
                if (!previewURL) {
                    $.error('jQuery.hoverPreview: data-preview wasn\'t set for item ' + self.$thumbs.index(this));
                    return;
                }
                
                var preload = new Image();
                preload.src = previewURL;
                
                var $preload = $(preload);
                
                // Make sure the image will fill the preview.
                $preload.css('width', '100%');
                $preload.css('height', '100%');
                $preload.css('pointer', 'pointer');
                
                self.previewImages.push($preload);
            });
        },
        
        /**
         * Bind event handlers.
         */
        _bind: function () {
            var self = this;
            var $element = this.element;
            
            // Register hover/click events for each item in $thumbs.
            var bindings;
            if (this.options.transition == 'both') {
                bindings = 'hover.hoverPreview click.hoverPreview';
            }
            else if (this.options.transition == 'click') {
                bindings = 'click.hoverPreview';
            }
            else if (this.options.transition == 'hover') {
                bindings = 'hover.hoverPreview';
            }
            
            this.$thumbs.bind(bindings, function(event) {
                if (!$(this).hasClass(self.options.activeClass)) {                    
                    var pos      = self.$thumbs.index(this);
                    var $current = self.$preview.find('img');
                    
                    self._deactivate();
                    self._activate(pos);
                    
                    if (event.type == 'click' && this.nodeName.toLowerCase() == 'a') {
                        // Stop anchor tags from following through to their click.
                        event.preventDefault();
                    }
                    
                    self._trigger('change', event, { index: pos });
                    
                    if ($current.length) {
                        $current.stop().fadeOut('slow', function() {
                            self._addImage(pos);
                        });
                        return;
                    }
                    
                    self._addImage(pos);
                }
            });
            
            // Register click event for $preview.
            this.$preview.bind('click.hoverPreview', function(event) {
                var imageURL = self.options.$link.attr('href');
                var target   = self.options.$link.attr('target');
                
                if (!target) {
                    target = '_parent';
                }
                
                if (imageURL) {
                    window.open(imageURL, target);
                }
            });
            
            // Style the current image to be clickable if one exists.
            this.$preview.find('img').css('pointer', 'pointer');
        },
        
        /**
         * Go to the image at the given position.
         *
         * @param The position of the image to go to.
         */
        gotoImage: function (position) {
            this._deactivate();
            this._activate(position);
            this._addImage(position);
        },
        
        /**
         * Set the given position to active, but don't change the image.
         *
         * @param The position to set active.
         */
        setActive: function (position) {
            this._deactivate();
            this._activate(position);
        },
        
        /**
         * Add an image to the preview container.
         *
         * @param pos The position of the item whose image should be added to the preview container.
         * @memberof HoverPreview
         */
        _addImage: function (pos) {
            var $element = this.element;
            
            if (!$element) {
                $.error('jQuery.hoverPreview: addImage called when not initialized.');
                return;
            }
            
            var $image  = this.previewImages[pos];
            var linkURL = this.$thumbs.eq(pos).attr('data-link'); 
            
            if (!$image) {
                $.error('jQuery.hoverPreview: Image wasn\'t defined for position: ' + pos);
                return;
            }
            
            if (linkURL) {
                this.$link.attr('href', linkURL);
            }
            else {
                $.error('jQuery.hoverPreview: data-link was not defined.');
            }
            
            this.$preview
                .empty()
                .append($image.css('display', 'none'));
                
            $image.fadeIn("slow");
        },
        
        /**
         * Toggle the currently active item so that it is
         * no longer active.
         *
         * @memberof HoverPreview
         */
        _deactivate: function () {
            var $element = this.element;
            
            $element
                .find('.' + this.options.activeClass)
                .removeClass(this.options.activeClass);
        },

        /**
         * Toggle the item at pos so that it is active.
         *
         * @param The position of the item to set to active.
         * @memberof HoverPreview
         */
        _activate: function (pos) {
            this.$thumbs
                .eq(pos)
                .addClass(this.options.activeClass);
        }
    });
})(jQuery);
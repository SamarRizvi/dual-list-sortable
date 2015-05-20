"use strict";

var app = angular.module('app');
/*
 * Thanks to 'thgreasi' for providing multi sort in ui-sortable
 * https://github.com/thgreasi/ui-sortable-multiselection
 * Angularui sortable multisort directive
 */
app.directive('uiSortableSelectable', 
  function () {
    return {
      link: function (scope, element, attrs) {
        /*Added Code*/
        var selectedColumnsIndex = attrs.selectedColumnsIndex;
        var selectedItemClass = attrs.selectedClassName;
        /*Added Code*/
        element.on('click', function (e) {
          var $this = angular.element(this);
          var $parent = $this.parent();
          var parentScope = $parent.scope();
          parentScope.sortableMultiSelect = parentScope.sortableMultiSelect || {};
          var targetElement = e.target || e.srcElement;
          var lastIndex = parentScope.sortableMultiSelect.lastIndex;
          var index = $this.index();
          if (e.ctrlKey || e.metaKey) {
            $this.toggleClass(selectedItemClass);
          } else if (e.shiftKey && lastIndex !== undefined && lastIndex >= 0) {
            if (index > lastIndex) {
              $parent.children().slice(lastIndex, index + 1).addClass(selectedItemClass);
            } else if (index < lastIndex) {
              $parent.children().slice(index, lastIndex).addClass(selectedItemClass);
            }
          } else {
            $parent.children('.' + selectedItemClass).not($this).removeClass(selectedItemClass);
            if (targetElement.tagName == "BUTTON" || targetElement.tagName == "I") {
              if (targetElement.className.contains('left-move-button') || targetElement.className.contains('right-move-button'))
                $this.removeClass(selectedItemClass);
              else
                $this.addClass(selectedItemClass);
            }
            else
              $this.toggleClass(selectedItemClass);
          }
          /*Added Code*/
          var indexes = angular.element.map($parent.children('.' + selectedItemClass), function (element) {
                  var elem = $(element);
                  return elem.scope().selectedColumn;
          });
          parentScope.selectedColumns[selectedColumnsIndex] = indexes;
          /*Added Code*/
          parentScope.sortableMultiSelect.lastIndex = index;
        });
      }
    };
  }
)
.factory('uiSortableMultiSelectionMethods',
  function () {
    function fixIndex(oldPosition, newPosition, x) {
      if (oldPosition < x && (newPosition === undefined || (oldPosition < newPosition && x <= newPosition))) {
        return x - 1;
      } else if (x < oldPosition && newPosition !== undefined && newPosition < oldPosition && newPosition <= x) {
        return x + 1;
      }
      return x;
    }

    function groupIndexes(indexes, oldPosition, newPosition) {
      var above = [],
              below = [];

      for (var i = 0; i < indexes.length; i++) {
        var x = indexes[i];
        if (x < oldPosition) {
          above.push(fixIndex(oldPosition, newPosition, x));
        } else if (oldPosition < x) {
          below.push(fixIndex(oldPosition, newPosition, x));
        }
      }

      return {
        above: above,
        below: below
      };
    }

    function extractModelsFromIndexes(ngModel, indexes) {
      var result = [];
      for (var i = indexes.length - 1; i >= 0; i--) {
        result.push(ngModel.splice(indexes[i], 1)[0]);
      }
      result.reverse();
      return result;
    }

    function extractGroupedModelsFromIndexes(ngModel, aboveIndexes, belowIndexes) {
      var models = {
        below: extractModelsFromIndexes(ngModel, belowIndexes),
        above: extractModelsFromIndexes(ngModel, aboveIndexes)
      };
      return models;
    }

    function combineCallbacks(first, second) {
      if (second && (typeof second === 'function')) {
        return function (e, ui) {
          first(e, ui);
          second(e, ui);
        };
      }
      return first;
    }

    return {
      extendOptions: function (sortableOptions) {
        sortableOptions = sortableOptions || {};
        var result = angular.extend({}, this, sortableOptions);

        for (var prop in sortableOptions) {
          if (sortableOptions.hasOwnProperty(prop)) {
            if (this[prop]) {
              if (prop === 'helper') {
                result.helper = this.helper;
              } else {
                result[prop] = combineCallbacks(this[prop], sortableOptions[prop]);
              }
            }
          }
        }

        return result;
      },
      helper: function (e, item) {
        // when starting to sort an unhighlighted item ,
        // deselect any existing highlighted items
        if (!item.hasClass(item.attr('selected-class-name'))) {
          item.addClass(item.attr('selected-class-name'))
                  .siblings()
                  .removeClass(item.attr('selected-class-name'));
        }

        var selectedElements = item.parent().children('.' + item.attr('selected-class-name'));
        var selectedSiblings = item.siblings('.' + item.attr('selected-class-name'));

        // indexes of the selected siblings
        var indexes = angular.element.map(selectedSiblings, function (element) {
          return angular.element(element).index();
        });

        item.sortableMultiSelect = {
          indexes: indexes
        };

        // Clone the selected items and to put them inside the helper
        var elements = selectedElements.clone();

        // like `helper: 'clone'` does, hide the dragged elements
        selectedSiblings.hide();

        // Create the helper to act as a bucket for the cloned elements
        var helperTag = item[0].tagName;
        var helper = angular.element('<' + helperTag + '/>');
        return helper.append(elements);
      },
      start: function (e, ui) {
        ui.item.sortableMultiSelect.sourceElement = ui.item.parent();
      },
      update: function (e, ui) {
        if (ui.item.sortable.received) {
          if (!ui.item.sortable.isCanceled()) {
            var scope = ui.item.sortable.droptarget.scope();
            /*Added Code*/
            var ngModel = scope.$eval(ui.item.sortable.droptarget.attr('ng-model')),
                    newPosition = ui.item.sortable.dropindex,
                    models = ui.item.sortableMultiSelect.moved;
            /*Added Code*/
            scope.$apply(function () {
              var ngModel = scope.$eval(ui.item.sortable.droptarget.attr('ng-model')),
                      newPosition = ui.item.sortable.dropindex,
                      models = ui.item.sortableMultiSelect.moved;

              // add the models to the target list
              Array.prototype.splice.apply(
                      ngModel,
                      [newPosition + 1, 0]
                      .concat(models.below));

              Array.prototype.splice.apply(
                      ngModel,
                      [newPosition, 0]
                      .concat(models.above));
            });
            /*Added Code*/
            $(ui.item.sortable.droptarget.children()[newPosition]).addClass(ui.item.attr('selected-class-name'));
            for (var i = 1; i <= models.above.length; i++) {
              $(ui.item.sortable.droptarget.children()[newPosition - i]).addClass(ui.item.attr('selected-class-name'));
            }
            for (var i = 1; i <= models.below.length; i++) {
              $(ui.item.sortable.droptarget.children()[newPosition + i]).addClass(ui.item.attr('selected-class-name'));
            }
            var selectedElements = angular.element.map(ui.item.sortable.droptarget.children('.' + ui.item.attr('selected-class-name')), function (element) {
                            var elem = $(element);
                            return elem.scope().selectedColumn;
            });
                          var selectedColumnsIndex = ui.item.sortable.droptarget.children([0]).attr('selected-columns-index');
            scope.selectedColumns[selectedColumnsIndex] = selectedElements;
                          var sourceColumnIndex = ui.item.sortable.source.children([0]).attr('selected-columns-index');
                          scope.selectedColumns[sourceColumnIndex] = [];
            /*Added Code*/
          } else {
            ui.item.sortableMultiSelect.sourceElement.find('> .' + ui.item.attr('selected-class-name')).show();
          }
        }
      },
      remove: function (e, ui) {
        if (!ui.item.sortable.isCanceled()) {
          var scope = ui.item.sortableMultiSelect.sourceElement.scope();

          scope.$apply(function () {
            var ngModel = scope.$eval(ui.item.sortableMultiSelect.sourceElement.attr('ng-model')),
                    oldPosition = ui.item.sortable.index;

            var indexes = groupIndexes(ui.item.sortableMultiSelect.indexes, oldPosition);

            // get the models and remove them from the original list
            // the code should run in reverse order,
            // so that the indexes will not break
            ui.item.sortableMultiSelect.moved = extractGroupedModelsFromIndexes(ngModel, indexes.above, indexes.below);
          });
        } else {
          ui.item.sortableMultiSelect.sourceElement.find('> .' + ui.item.attr('selected-class-name')).show();
        }
      },
      stop: function (e, ui) {
        var sourceElement = ui.item.sortableMultiSelect.sourceElement || ui.item.parent();
        if (!ui.item.sortable.received &&
                // ('dropindex' in ui.item.sortable) &&
                !ui.item.sortable.isCanceled()) {
          var ngModel = sourceElement.scope().$eval(sourceElement.attr('ng-model')),
                  oldPosition = ui.item.sortable.index,
                  newPosition = ui.item.sortable.dropindex;

          var draggedElementIndexes = ui.item.sortableMultiSelect.indexes;
          if (!draggedElementIndexes.length) {
            return;
          }

          if (newPosition === undefined) {
            newPosition = oldPosition;
          }

          var indexes = groupIndexes(draggedElementIndexes, oldPosition, newPosition);

          // get the model of the dragged item
          // so that we can locate its position
          // after we remove the co-dragged elements
          var draggedModel = ngModel[newPosition];

          // get the models and remove them from the list
          // the code should run in reverse order,
          // so that the indexes will not break
          var models = extractGroupedModelsFromIndexes(ngModel, indexes.above, indexes.below);

          // add the models to the list
          Array.prototype.splice.apply(
                  ngModel,
                  [ngModel.indexOf(draggedModel) + 1, 0]
                  .concat(models.below));

          Array.prototype.splice.apply(
                  ngModel,
                  [ngModel.indexOf(draggedModel), 0]
                  .concat(models.above));

          //ui.item.parent().find('> .' + selectedItemClass).removeClass('' + selectedItemClass).show();
          ui.item.parent().find('> .' + ui.item.attr('selected-class-name')).show();
        } else if (ui.item.sortable.isCanceled()) {
          sourceElement.find('> .' + ui.item.attr('selected-class-name')).show();
        }
      }
    };
  });
/**
 * Angular directive to perform dual list movement through the use of buttons and jquery ui sortable.
 * Depends on jQuery UI and angular-ui sortable.
 * 
 * @class dualListSortable
 * @memberOf application.
 * 
 * @author Samar Rizvi
 * @since 2015.03.27.17.55.50
 */
app.directive('dualListSortable', function ($timeout, uiSortableMultiSelectionMethods, arrayUtils) {
  return {
    restrict: 'E',
    transclude: false,
    scope: {
      allSortableModel: "=",
      selectedSortableModel: "=",
      nonSelectedListLabel: "@",
      selectedListLabel: "@",
      sortableOptions: '=',
      showField: '@'
    },
    controller: function ($scope, $element) {
      $.expr[":"].containsIgnoreCase = $.expr.createPseudo(function (arg) {
        return function (elem) {
          return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
        };
      });
      
      $scope.uiSortableOptions = uiSortableMultiSelectionMethods.extendOptions({
        tolerance: 'pointer',
        placeholder: $scope.sortableOptions.placeholder,
        connectWith: '.' + $scope.sortableOptions.connectWith,
        scroll: true,
        over: function (event, ui) {
          ui.item.data('sortableItem').scrollParent = ui.placeholder.parent();
          ui.item.data('sortableItem').overflowOffset = ui.placeholder.parent().offset();
        }
      });
      if (!$scope.selectedColumns)
        $scope.selectedColumns = [];
      if ($scope.selectedSortableModel == undefined) {
        $scope.availableList = $scope.allSortableModel;
        $scope.selectedSortableModel=[];
      }
      else
        $scope.availableList = arrayUtils.subtract($scope.allSortableModel, $scope.selectedSortableModel).unique();

      $scope.scrollToElement = function(elementParent, elementChild, listPosition) {
          $("." + elementChild + "." + listPosition).highlightRegex();
          var regex = new RegExp($('#' + elementParent + '-filter-' + listPosition).val(), 'ig');
          if (typeof regex !== 'undefined') {             
             if ($('#' + elementParent + '-filter-' + listPosition).val() != '')
               $("." + elementChild + "." + listPosition).highlightRegex(regex);
           }
        $("." + elementChild + "." + listPosition).find('.highlight')[0].scrollIntoView();
      };
      
      $scope.pushSelectedColumns = function (selectedColumns, allColumnsLeft, allColumnsRight, direction) {
        if (selectedColumns != null && selectedColumns != undefined) {
          if (!angular.isArray(selectedColumns)) {
            allColumnsRight.unshift(selectedColumns);
            allColumnsLeft.splice(allColumnsLeft.indexOf(selectedColumns), 1);
            $timeout(function () {
              if (direction == 'ltr') {
                $($element.children().find('.right-list')).removeClass($element.find("[selected-class-name]:first").attr('selected-class-name'));
                $($element.children().find('.right-list')[0]).addClass($element.find("[selected-class-name]:first").attr('selected-class-name'));
                $scope.selectedColumns[$scope.rightSelected] = [selectedColumns];
                $scope.selectedColumns[$scope.leftSelected] = [];
              }
              else {
                $($element.children().find('.left-list')).removeClass($element.find("[selected-class-name]:first").attr('selected-class-name'));
                $($element.children().find('.left-list')[0]).addClass($element.find("[selected-class-name]:first").attr('selected-class-name'));
                $scope.selectedColumns[$scope.leftSelected] = [selectedColumns];
                $scope.selectedColumns[$scope.rightSelected] = [];
              }
            }, 0)
          }
          else {
            if (selectedColumns && selectedColumns.length) {
              if (direction == 'ltr') {
                $($element.children().find('.right-list')).removeClass($element.find("[selected-class-name]:first").attr('selected-class-name'));
                $scope.selectedColumns[$scope.rightSelected] = [];
              }
              else {
                $($element.children().find('.left-list')).removeClass($element.find("[selected-class-name]:first").attr('selected-class-name'));
                $scope.selectedColumns[$scope.leftSelected] = [];
              }
            }

            var currentSelectedColumn = 0;

            angular.forEach(selectedColumns.reverse(), function (selectedColumn) {
              if (allColumnsLeft.indexOf(selectedColumn) != -1) {

                allColumnsRight.unshift(selectedColumn);
                allColumnsLeft.splice(allColumnsLeft.indexOf(selectedColumn), 1);

                $timeout(function () {
                  if (direction == 'ltr') {
                    $($element.children().find('.right-list')[currentSelectedColumn]).addClass($element.find("[selected-class-name]:first").attr('selected-class-name'));
                    $scope.selectedColumns[$scope.rightSelected].unshift(selectedColumn);
                  }
                  else {
                    $($element.children().find('.left-list')[currentSelectedColumn]).addClass($element.find("[selected-class-name]:first").attr('selected-class-name'));
                    $scope.selectedColumns[$scope.leftSelected].unshift(selectedColumn);
                  }
                  currentSelectedColumn++;
                }, 0);

              }
            });            
          }
          $timeout(function () {
              var selectedElements = angular.element.map($element.children().find('.left-list.' + $element.find("[selected-class-name]:first").attr('selected-class-name')), function (element) {
              var elem = $(element);
              return elem.scope().selectedColumn;
              });
              $scope.selectedColumns[$scope.leftSelected] = selectedElements;
              selectedElements = angular.element.map($element.children().find('.right-list.' + $element.find("[selected-class-name]:first").attr('selected-class-name')), function (element) {
              var elem = $(element);
              return elem.scope().selectedColumn;
              });
              $scope.selectedColumns[$scope.rightSelected] = selectedElements;
            },0);
        }
      };

      $scope.moveColumnUp = function (columnIndex, columns) {
        columns.move(columnIndex, columnIndex - 1);
      };

      $scope.moveColumnDown = function (columnIndex, columns) {
        columns.move(columnIndex, columnIndex + 1);
      };
    },
    link: function (scope, element, attrs) {
      scope.leftSelected = "left_" + scope.sortableOptions.connectWith + "_" + scope.sortableOptions.placeholder;
      scope.rightSelected = "right_" + scope.sortableOptions.connectWith + "_" + scope.sortableOptions.placeholder;
    },
    templateUrl: "DualListTemplate.html"
  };
});

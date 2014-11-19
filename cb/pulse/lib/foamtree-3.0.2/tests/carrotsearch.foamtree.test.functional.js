describe("FoamTree", foamtreeTest(function() {

  // All data sets
  var synthetic = Data.synthetic;
  var realWorld = Data.realWorld;
  var all = Data.all;

  var syntheticDatasets = Data.syntheticDatasets;
  var realWorldDatasets = Data.realWorldDatasets;

  describe("should report final relaxation step", function() {
    it("when relaxation quality threshold is achieved", sinon.test(function() {
      expectFinalRelaxationStepReported(synthetic.threeLevels.dataObject, 3000, true, false);
    }));

    it("when relaxation quality threshold is not achieved", sinon.test(function() {
      expectFinalRelaxationStepReported(synthetic.threeLevels.dataObject, 200, false, true);
    }));

    function expectFinalRelaxationStepReported(data, relaxationDuration, complete, timeout) {
      var clock = sinon.useFakeTimers();
      var relaxationComplete = false;
      var relaxationTimeout = false;

      options.dataObject = data;
      options.relaxationVisible = true;
      options.relaxationMaxDuration = relaxationDuration;
      options.onRelaxationStep = function(progress, complete, timeout) {
        relaxationComplete = relaxationComplete || complete;
        relaxationTimeout = relaxationTimeout || timeout;
      };
      newFoamTree();

      clock.tick(options.relaxationMaxDuration * 1.5);
      expect(relaxationComplete).to.equal(complete);
      expect(relaxationTimeout).to.equal(timeout);
    }
  });

  describe("should set the initial state", function() {
    it("when selection is provided in dataObject", sinon.test(function() {
      withInitialViewRendered(function (clock) {
        expect(foamtree.get("state", "selected").selected).to.be.true;
      }, {
        dataObject: {
          groups: [
            { id: "selected", label: "Initially selected", selected: true },
            { id: "unselected", label: "Initially unselected" }
          ]
        }
      });
    }));

    it("when open state is provided in dataObject", sinon.test(function() {
      withInitialViewRendered(function (clock) {
        expect(foamtree.get("state", "open").open).to.be.true;
      }, {
        dataObject: {
          groups: [
            { id: "open", label: "Initially open", groups: [ { label: "1" }, { label: "2" } ], open: true },
            { id: "closed", label: "Initially closed" }
          ]
        }
      });
    }));

    it("when exposure is provided in dataObject", sinon.test(function() {
      withInitialViewRendered(function (clock) {
        expect(foamtree.get("state", "exposed").exposed).to.be.true;
      }, {
        dataObject: {
          groups: [
            { id: "exposed", label: "Initially exposed", exposed: true },
            { id: "unexposed", label: "Initially unexposed" }
          ]
        }
      });
    }));
  });

  describe("should stop momentum panning", function() {
    beforeEach(function() {
      options.dataObject = synthetic.oneLevel.dataObject;
    });

    it("after reset is triggered with mouse wheel", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        // Zoom in
        foamtree.trigger("mousewheel", {
          x: 1, y: 1, delta: 3
        });
        clock.tick(foamtree.get("zoomMouseWheelDuration") * 3 + 20);

        // Trigger momentum panning
        foamtree.trigger("dragstart", { x: 10, y: 10 });
        foamtree.trigger("drag", { x: 5, y: 5 });
        foamtree.trigger("dragend", { x: 5, y: 5 });
        clock.tick(300);

        // Trigger mouse wheel-based reset
        foamtree.trigger("mousewheel", { x: 10, y: 10, delta: -1 });
        clock.tick(17);
        foamtree.trigger("mousewheel", { x: 10, y: 10, delta: -1 });
        clock.tick(17);
        foamtree.trigger("mousewheel", { x: 10, y: 10, delta: -1 });
        clock.tick(17);
        foamtree.trigger("mousewheel", { x: 10, y: 10, delta: -1 });
        clock.tick(17);
        foamtree.trigger("mousewheel", { x: 10, y: 10, delta: -1 });
        clock.tick(5000);

        // Reset should not cause any redraws
        foamtree.set("onRedraw", sinon.spy());
        foamtree.reset();
        clock.tick(foamtree.get("zoomMouseWheelDuration") * 2 + 20);

        expect(foamtree.get("onRedraw")[0]).not.to.have.been.called;
      });
    }));
  });

  describe("should not call onRedraw", function() {
    beforeEach(function() {
      options.dataObject = synthetic.twoLevels.dataObject;
    });

    it("after expose promise is called", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        foamtree.expose(options.dataObject.groups[0]).then(function() {
          foamtree.set("onRedraw", sinon.spy());
        });

        // Let the exposes run
        clock.tick(foamtree.get("exposeDuration") + 20);

        expect(foamtree.get("onRedraw")[0]).not.to.have.been.called;
      });
    }));

    it("after openclose promise is called", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        var onRedraw = sinon.spy(function onRedraw() { });
        foamtree.open(options.dataObject.groups[0]).then(function() {
          foamtree.set("onRedraw", onRedraw);
        }, true);

        // Let the open run
        clock.tick(foamtree.get("openCloseDuration") + 20);

        expect(onRedraw).not.to.have.been.called;
      });
    }));

    it("after the same groups are requested to expose again", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        foamtree.expose(options.dataObject.groups[0]).then(function() {
          foamtree.set("onRedraw", sinon.spy());
          foamtree.expose(options.dataObject.groups[0]);
        });

        // Let the exposes run
        clock.tick(foamtree.get("exposeDuration") * 2 + 20);

        expect(foamtree.get("onRedraw")[0]).not.to.have.been.called;
      });
    }));

    it("after all groups are requested to unexpose and no sites are currently exposed", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        foamtree.set("onRedraw", sinon.spy());
        foamtree.expose({ all: true, exposed: false });

        // Let the exposes run
        clock.tick(foamtree.get("exposeDuration") + 20);

        expect(foamtree.get("onRedraw")[0]).not.to.have.been.called;
      });
    }));

    it("after the already open groups are requested to open again", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        foamtree.open(options.dataObject.groups[0]).then(function() {
          foamtree.set("onRedraw", sinon.spy());
          foamtree.open(options.dataObject.groups[0]);
        });

        // Let the opens run
        clock.tick(foamtree.get("openCloseDuration") * 2 + 20);

        expect(foamtree.get("onRedraw")[0]).not.to.have.been.called;
      });
    }));

    it("on unexpose interaction when no sites are currently exposed", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        foamtree.set("onRedraw", sinon.spy(function onRedraw() {}));

        var group = options.dataObject.groups[0];
        var geom = foamtree.get("geometry", group);
        foamtree.trigger("doubleclick", { x: geom.polygonCenterX, y: geom.polygonCenterY, secondary: true });

        // Let the expose run
        clock.tick(foamtree.get("exposeDuration") * 2 + 20);

        expect(foamtree.get("onRedraw")[0]).not.to.have.been.called;
      });
    }));

    it("when reset is applied to initially rendered visualization", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        foamtree.set("onRedraw", sinon.spy(function onRedraw() {}));

        foamtree.reset();
        clock.tick(foamtree.get("exposeDuration") * 2 + 20);

        expect(foamtree.get("onRedraw")[0]).not.to.have.been.called;
      });
    }));

    it("when reset is applied to a view that does not need resetting", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        foamtree.expose(options.dataObject.groups[0]).then(function() {
          foamtree.expose({ groups: options.dataObject.groups[0], exposed: false }).then(function() {
            foamtree.set("onRedraw", sinon.spy(function onRedraw() { }));
            foamtree.reset();
          });
        });

        clock.tick(foamtree.get("exposeDuration") * 4 + 20);

        expect(foamtree.get("onRedraw")[0]).not.to.have.been.called;
      });
    }));

    it("when reset is applied to an already reset view", sinon.test(function() {
      withInitialViewRendered(function(clock) {
        var group = options.dataObject.groups[0];
        var geom = foamtree.get("geometry", group);

        foamtree.trigger("mousewheel", {
          x: geom.polygonCenterX, y: geom.polygonCenterY, delta: 1
        });
        clock.tick(foamtree.get("zoomMouseWheelDuration") + 100);

        foamtree.trigger("mousewheel", {
          x: geom.polygonCenterX, y: geom.polygonCenterY, delta: -1
        });
        clock.tick(foamtree.get("zoomMouseWheelDuration") + 100);

        foamtree.set("onRedraw", sinon.spy(function onRedraw() { }));
        foamtree.reset();

        clock.tick(foamtree.get("zoomMouseWheelDuration") * 2 + 100);

        expect(foamtree.get("onRedraw")[0]).not.to.have.been.called;
      });
    }));
  });

  cube(
    {
      "should not call onRolloutStart": shouldNeverCall("onRolloutStart"),
      "should not call onRolloutComplete": shouldNeverCall("onRolloutComplete"),
      "should not call onRedraw": shouldNeverCall("onRedraw")
    },
    {
      "configured with undefined dataObject": function() {
        options.dataObject = undefined;
      },
      "configured with empty dataObject": function() {
        options.dataObject = { };
      },
      "configured with zero groups": function() {
        options.dataObject = { groups: [] };
      }
    }
  );

  cube(
    {
      "should call onRolloutStart once": shouldCallOnce("onRolloutStart"),
      "should call onRolloutComplete once": shouldCallOnce("onRolloutComplete"),

      "should not call onRolloutComplete before rollout completes": sinon.test(function() {
        var clock = sinon.useFakeTimers();
        options.onRolloutComplete = this.spy(function onRolloutComplete() {});
        newFoamTree();

        expect(options.onRolloutComplete).not.to.have.been.called;
        clock.tick((options.rolloutDuration || options.fadeDuration) * 0.3);
        expect(options.onRolloutComplete).not.to.have.been.called;
        clock.tick(totalRelaxationAndRolloutTime());
        expect(options.onRolloutComplete).to.have.been.called;
      }),

      "should call onRolloutStart, onRedraw and onRolloutComplete in the right order": sinon.test(function() {
        // Note: this test can be affected by interacting with
        // the visualization in the browser while the test is running.

        var clock = sinon.useFakeTimers();
        options.onRolloutStart = this.spy(function onRolloutStart() {});
        options.onRolloutComplete = this.spy(function onRolloutComplete() {});
        options.onRedraw = this.spy(function onRedraw() {});

        newFoamTree();
        clock.tick(17); // onRolloutStart is called in afterFrame
        expect(options.onRolloutStart).to.have.been.called;
        clock.tick((options.rolloutDuration || options.fadeDuration) * 0.3);
        expect(options.onRedraw).to.have.been.called;
        clock.tick(totalRelaxationAndRolloutTime());
        expect(options.onRolloutComplete).to.have.been.called;

        expect(options.onRedraw).not.to.have.been.calledBefore(options.onRolloutStart);
        expect(options.onRedraw).not.to.have.been.calledAfter(options.onRolloutComplete);
      })
    },
    {
      "configured with immediate rollout": function() {
        options.rolloutDuration = 0;
        options.fadeDuration = 0;
      },
      "configured with fading": function() {
        options.rolloutDuration = 0;
        options.fadeDuration = 500;
      },
      "configured with animated rollout": function() {
        options.rolloutDuration = 1000;
      }
    },
    {
      "configured with precomputed relaxation": function() {
        options.relaxationVisible = false;
      },
      "configured with animated relaxation and immediate weight growing": function() {
        options.relaxationVisible = true;
        options.groupGrowingDuration = 0;
      },
      "configured with animated relaxation and animated weight growing": function() {
        options.relaxationVisible = true;
        options.groupGrowingDuration = 2000;
        options.groupGrowingDrag = 0.25;
      }
    },
    configuredWith(syntheticDatasets)
  );

  cube(
    {
      "should call onRedraw once": shouldCallOnce("onRedraw")
    },
    {
      "configured with precomputed relaxation and immediate rollout": function() {
        options.relaxationVisible = false;
        options.rolloutDuration = 0;
      }
    },
    configuredWith(syntheticDatasets)
  );

  describe("should call onRolloutComplete", function() {
    it("after relaxation times out", sinon.test(function() {
      var clock = sinon.useFakeTimers();

      options.initializer = "fisheye";
      options.relaxationVisible = true;
      options.relaxationMaxDuration = 1000;
      options.relaxationQualityThreshold = 0.0;
      options.dataObject = realWorld["data-mining-100-topic-hierarchical.jsonp"].dataObject;
      options.onRolloutComplete = sinon.spy();
      options.onRelaxationStep = sinon.spy();
      newFoamTree();

      clock.tick(options.relaxationMaxDuration * 1.5);
      expect(options.onRolloutComplete).to.have.been.calledOnce;
      expect(options.onRelaxationStep).not.to.have.been.calledAfter(options.onRolloutComplete);
    }));
  });

  cube(
    {
      "should call onRedraw after resizing to a changed container size": sinon.test(function() {
        withInitialViewRendered(function(clock) {
          // Set the actual test options
          var opts = {
            onRolloutStart: sinon.spy(),
            onRolloutComplete: sinon.spy(),
            onRedraw: sinon.spy(),
            relaxationMaxDuration: 2000
          };
          foamtree.set(opts);

          // Resize
          element.setAttribute("class", "halfsize");
          foamtree.resize();

          // Let the relaxation run
          clock.tick(opts.relaxationMaxDuration + 100);

          // onRolloutStart and onRolloutComplete may get called
          // for larger data sets in animated relaxation mode,
          // we don't check this here.
          expect(opts.onRedraw).to.have.been.called;
        });
      })
    },
    {
      "configured with precomputed relaxation": function() {
        options.relaxationVisible = false;
      },
      "configured with animated relaxation": function() {
        options.relaxationVisible = true;
      }
    },
    configuredWith(syntheticDatasets)
  );

  cube(
    {
      "should not call onRedraw after resizing to an unchanged container size": sinon.test(function() {
        withInitialViewRendered(function(clock) {
          // Set the actual test options
          var opts = {
            onRolloutStart: sinon.spy(),
            onRolloutComplete: sinon.spy(),
            onRedraw: sinon.spy(),
            relaxationMaxDuration: 2000
          };
          foamtree.set(opts);

          // Call resize() without a container size change
          foamtree.resize();
          clock.tick(opts.relaxationMaxDuration + 100);
          expect(opts.onRedraw).not.to.have.been.called;

          // Resize to a zero-area container
          element.setAttribute("class", "zerosize");
          foamtree.resize();

          // Let the relaxation run (though it shouldn't)
          clock.tick(opts.relaxationMaxDuration + 100);
          expect(opts.onRedraw).not.to.have.been.called;

          // Resize back to the previous size
          element.setAttribute("class", "");
          foamtree.resize();
          clock.tick(opts.relaxationMaxDuration + 100);
          expect(opts.onRedraw).not.to.have.been.called;
        });
      })
    },
    {
      "configured with precomputed relaxation": function() {
        options.relaxationVisible = false;
      },
      "configured with animated relaxation": function() {
        options.relaxationVisible = true;
      }
    },
    configuredWith(syntheticDatasets)
  );

  cube(
    {
      "should ignore resizing to a zero-area container": sinon.test(function() {
        withInitialViewRendered(function(clock) {
          // Set the actual test options
          var opts = {
            onRolloutStart: sinon.spy(),
            onRolloutComplete: sinon.spy(),
            onRedraw: sinon.spy(),
            relaxationMaxDuration: 2000
          };
          foamtree.set(opts);

          // Resize to a zero-area container
          element.setAttribute("class", "zerosize");
          foamtree.resize();

          // Let the relaxation run (though it shouldn't)
          clock.tick(opts.relaxationMaxDuration + 100);
          expect(opts.onRedraw).not.to.have.been.called;

          // Resize back to some non-zero area
          element.setAttribute("class", "halfsize");
          foamtree.resize();
          clock.tick(opts.relaxationMaxDuration + 100);
          expect(opts.onRedraw).to.have.been.called;
        });
      })
    },
    {
      "configured with precomputed relaxation": function() {
        options.relaxationVisible = false;
      },
      "configured with animated relaxation": function() {
        options.relaxationVisible = true;
      }
    },
    configuredWith(syntheticDatasets)
  );

  cube(
    {
      "should not fail": sinon.test(function() {
        var clock = sinon.useFakeTimers();
        options.onRolloutComplete = this.spy();
        newFoamTree();

        clock.tick(totalRelaxationAndRolloutTime());
      })
    },
    {
      "configured with precomputed relaxation": function() {
        options.relaxationVisible = false;
      },
      "configured with animated relaxation": function() {
        options.relaxationVisible = true;
      }
    },
    {
      "configured with treemap initializer": function() {
        options.initializer = "treemap";
      },
      "configured with fisheye initializer": function() {
        options.initializer = "fisheye";
      },
      "configured with blackhole initializer": function() {
        options.initializer = "blackhole";
      },
      "configured with order initializer": function() {
        options.initializer = "order";
      },
      "configured with large group border and small inset": function() {
        // This is pretty extreme, but still possible to achieve:
        // due to large border and small inset, parent site will not render
        // because the border is too large, but child sites will render
        // because inset is small (an not added to parent's border).
        options.groupBorderWidth = 120;
        options.groupInsetWidth = 0;
      },
      "configured with large group inset": function() {
        options.groupInsetWidth = 100;
      },
      "configured with minimum group diameter": function() {
        options.groupMinDiameter = 100;
      }
    },
    configuredWith(syntheticDatasets)
  );

  describe("should deselect site", function() {
    it("when site is clicked again", verifyWhenRolloutComplete(
      function() {
        options.dataObject = synthetic.oneGroup.dataObject;
      },
      function(done) {
        var group = options.dataObject.groups[0];
        var geom = foamtree.get("geometry", group);
        foamtree.trigger("click", { x: geom.polygonCenterX, y: geom.polygonCenterY });
        expect(foamtree.get("state", group)).to.have.property("selected", true);
        foamtree.trigger("click", { x: geom.polygonCenterX, y: geom.polygonCenterY });
        expect(foamtree.get("state", group)).to.have.property("selected", false);
        done();
      })
    );
  });

  describe("should clear the visualization", function() {
    it("when dataObject is set to undefined", checkWith(undefined));
    it("when dataObject is set to null", checkWith(null));
    it("when dataObject is set to {}", checkWith({}));

    function checkWith(dataObjectToCheck) {
      return verifyWhenRolloutComplete(
        function() {
          options.dataObject = synthetic.oneGroup.dataObject;
        },
        function(done) {
          var onModelChanged = sinon.spy(function onModelChanged() {});
          foamtree.set("onModelChanged", onModelChanged);
          foamtree.set("dataObject", dataObjectToCheck);
          expect(onModelChanged).to.have.been.calledOnce;
          expect(onModelChanged).to.always.have.been.calledWithExactly(dataObjectToCheck);
          done();
        });
    }
  });

  describeAssuming(unobfuscated || demoBinaries, "in demo mode", function() {
    it("should not call groupColorDecorator for attribution site", verifyWhenRolloutComplete(
      function() {
        options.dataObject = synthetic.oneGroup.dataObject;
        options.groupColorDecorator = sinon.spy();
      },
      function(done) {
        expect(options.groupColorDecorator).to.have.been.calledOnce;
        done();
      })
    );

    it("should not call groupLabelDecorator for attribution site", verifyWhenRolloutComplete(
      function() {
        options.dataObject = synthetic.oneGroup.dataObject;
        options.groupLabelDecorator = sinon.spy();
      },
      function(done) {
        expect(options.groupLabelDecorator).to.have.been.calledOnce;
        done();
      })
    );
  });

  describeAssuming(unobfuscated || licensedBinaries, "in licensed mode", function() {
    beforeEach(function() {
      if (unobfuscated) {
        LIMITED_DEMO = false;
      }
    });

    it("should call groupColorDecorator for attribution site in licensed mode", verifyWhenRolloutComplete(
      function() {
        options.dataObject = synthetic.oneGroup.dataObject;
        options.groupColorDecorator = sinon.spy();
        options.attributionText = "Attribution";
      },
      function(done) {
        expect(options.groupColorDecorator).to.have.been.calledTwice;
        done();
      })
    );

    it("should call groupLabelDecorator for attribution site in licensed mode", verifyWhenRolloutComplete(
      function() {
        options.dataObject = synthetic.oneGroup.dataObject;
        options.groupLabelDecorator = sinon.spy();
        options.attributionText = "Attribution";
      },
      function(done) {
        expect(options.groupLabelDecorator).to.have.been.calledTwice;
        done();
      })
    );
  });

  describe("should throw an error", function() {
    it("when calling public methods of a disposed instance", function() {
      newFoamTree();
      foamtree.dispose();
      try {
        foamtree.set("dataObject", null);
        throw "An exception should have been called.";
      } catch (e) {
      }
    });
  });

  // We need memory info for this test
  describeAssuming(memoryStatusAvailable, "should not leak memory", function() {
    // TODO: add more memory leak tests: resizing, zooming, exposing, opening/closing sites
    it("when the same instance gets reloaded with multiple data sets [slow]", function(done) {
      // The option combinations to run
      var dimensions = [
        { option: "initializer", values: [ "random", "treemap", "fisheye", "order", "blackhole" ] },
        { option: "relaxationVisible", values: [ true, false ] },
        { option: "dataObject", values: realWorldDatasets.map(function (key) { return realWorld[key].dataObject; } ) }
      ];

      var optionSets = [];
      var optionSetIndex = 0;
      var heapCheckpoint = 0.25, heapSize;

      foamtree = new CarrotSearchFoamTree({ element: element });

      withOptions(function() {
        optionSets.push(extend({}, options));
        options = extend({}, defaultOptions);
      }, dimensions);

      // Allow 20s per data set
      this.timeout(optionSets.length * 20000);

      loadOptionSet();

      function loadOptionSet() {
        if (optionSetIndex < optionSets.length) {
          var optionSet = optionSets[optionSetIndex++];
          optionSet.onRolloutComplete = loadOptionSet;
          optionSet.rolloutDuration = 1000;
          optionSet.rolloutPolygonDrag = 0.1;
          optionSet.rolloutLabelDrag = 0.1;
          optionSet.pullbackDuration = 500;
          foamtree.set(optionSet);

          // Take a heap checkpoint sample. We'll compare the final heap size to this.
          if (optionSetIndex > optionSets.length * heapCheckpoint) {
            if (heapSize === undefined) {
              heapSize = window.performance.memory.usedJSHeapSize;
            }
          }
        } else {
          expect(window.performance.memory.usedJSHeapSize).to.be.below(heapSize * 1.5);
          foamtree.dispose();
          done();
        }
      }

      function withOptions(action, dimensions) {
        var rest = dimensions.slice(0);
        var dimension = rest.shift();
        var option = dimension.option;
        var values = dimension.values;

        for (var i = values.length - 1; i >= 0; i--) {
          options[option] = values[i];
          if (rest.length === 0) {
            action();
          } else {
            withOptions(action, rest);
          }
        }
      }
    });
  });
}));
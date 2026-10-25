"""Provisional meaning inventory; importing this package does not load NLP resources."""
__all__ = ["analyse", "analyse_file", "render_table"]


def __getattr__(name):
    if name in __all__:
        from . import pipeline
        return getattr(pipeline, name)
    raise AttributeError(name)

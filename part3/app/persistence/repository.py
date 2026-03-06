"""Repository abstractions and in-memory implementation.

This module defines the repository contract and a simple in-memory storage
implementation used by the service layer.
"""

from abc import ABC, abstractmethod

class Repository(ABC):
    """Define the base repository interface."""

    @abstractmethod
    def add(self, obj):
        """Store an object in the repository.

        Args:
            obj: Domain object to persist.
        """
        pass

    @abstractmethod
    def get(self, obj_id):
        """Retrieve an object by identifier.

        Args:
            obj_id (str): Object identifier.

        Returns:
            object | None: Matching object, or `None` if not found.
        """
        pass

    @abstractmethod
    def get_all(self):
        """Retrieve all stored objects.

        Returns:
            list[object]: Stored objects.
        """
        pass

    @abstractmethod
    def update(self, obj_id, data):
        """Update an object by identifier.

        Args:
            obj_id (str): Object identifier.
            data (dict): Partial update payload.
        """
        pass

    @abstractmethod
    def delete(self, obj_id):
        """Delete an object by identifier.

        Args:
            obj_id (str): Object identifier.
        """
        pass

    @abstractmethod
    def get_by_attribute(self, attr_name, attr_value):
        """Retrieve the first object matching an attribute value.

        Args:
            attr_name (str): Attribute name.
            attr_value: Expected attribute value.

        Returns:
            object | None: First matching object, or `None`.
        """
        pass


class InMemoryRepository(Repository):
    """Implement repository storage in memory."""

    def __init__(self):
        """Initialize in-memory storage."""
        self._storage = {}

    def add(self, obj):
        """Store an object keyed by its `id` attribute.

        Args:
            obj: Domain object exposing an `id` attribute.
        """
        self._storage[obj.id] = obj

    def get(self, obj_id):
        """Retrieve an object by ID.

        Args:
            obj_id (str): Object identifier.

        Returns:
            object | None: Matching object, or `None` if not found.
        """
        return self._storage.get(obj_id)

    def get_all(self):
        """Return all stored objects as a list.

        Returns:
            list[object]: Stored objects.
        """
        return list(self._storage.values())

    def update(self, obj_id, data):
        """Apply partial updates to an existing object.

        Args:
            obj_id (str): Object identifier.
            data (dict): Partial update payload.
        """
        obj = self.get(obj_id)
        if obj:
            obj.update(data)

    def delete(self, obj_id):
        """Remove an object by ID if it exists.

        Args:
            obj_id (str): Object identifier.
        """
        if obj_id in self._storage:
            del self._storage[obj_id]

    def get_by_attribute(self, attr_name, attr_value):
        """Return the first object matching the given attribute value.

        Args:
            attr_name (str): Attribute name.
            attr_value: Expected attribute value.

        Returns:
            object | None: First matching object, or `None`.
        """
        return next((obj for obj in self._storage.values()
                     if getattr(obj, attr_name) == attr_value), None)
